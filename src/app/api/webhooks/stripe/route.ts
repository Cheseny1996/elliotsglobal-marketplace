import Stripe from "stripe";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { databaseIsConfigured } from "@/lib/config";
import { Order, Product, StripeEvent } from "@/lib/models";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!databaseIsConfigured()) {
    return NextResponse.json({ error: "MongoDB must be configured before accepting Stripe webhooks." }, { status: 503 });
  }
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripeConstructEvent(new Stripe(secret), payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }
  await connectToDatabase();
  const priorEvent = await StripeEvent.findOne({ eventId: event.id }).lean();
  if (priorEvent) return NextResponse.json({ received: true });

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (event.type === "checkout.session.completed" && orderId && session.payment_status === "paid") {
    const order = await Order.findOne({ _id: orderId, stripeSessionId: session.id }).select("totalCents currency status");
    if (!order) return NextResponse.json({ error: "No matching marketplace order found for this session." }, { status: 500 });
    if (session.amount_total !== order.totalCents || session.currency !== order.currency) {
      console.error("Stripe Checkout amount or currency did not match the saved order.", {
        orderId,
        sessionId: session.id,
        expectedAmount: order.totalCents,
        receivedAmount: session.amount_total,
        expectedCurrency: order.currency,
        receivedCurrency: session.currency,
      });
      return NextResponse.json({ error: "Checkout amount did not match the saved order." }, { status: 400 });
    }
    await Order.updateOne(
      { _id: orderId, stripeSessionId: session.id, status: "pending", inventoryReleased: false },
      {
        status: "paid",
        shippingAddress: session.collected_information?.shipping_details?.address
          ? {
              ...session.collected_information.shipping_details.address,
              name: session.collected_information.shipping_details.name ?? session.customer_details?.name,
            }
          : undefined,
      },
    );
  }
  if (event.type === "checkout.session.expired" && orderId) {
    const expired = await Order.findOneAndUpdate(
      { _id: orderId, stripeSessionId: session.id, status: "pending", inventoryReleased: false },
      { status: "expired", inventoryReleased: true },
      { new: true },
    ).lean();
    if (expired) {
      await Promise.all(expired.lines.map((line) =>
        Product.updateOne({ _id: line.productId }, { $inc: { stock: line.quantity } }),
      ));
    }
  }
  await StripeEvent.create({ eventId: event.id, type: event.type });
  return NextResponse.json({ received: true });
}

function stripeConstructEvent(stripe: Stripe, payload: string, signature: string, secret: string) {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
