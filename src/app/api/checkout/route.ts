import Stripe from "stripe";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { calculateSellerSplit, getCommissionPercent, getShippingCents } from "@/lib/commerce";
import { connectToDatabase } from "@/lib/db";
import { Order, Product, User } from "@/lib/models";
import { cartSchema } from "@/lib/validation";

function stripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Stripe checkout is not configured. Add STRIPE_SECRET_KEY to the server environment.");
  return new Stripe(secret);
}

export async function POST(request: Request) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Checkout needs MongoDB configuration." }, { status: 503 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Checkout needs a Stripe test or live secret key." }, { status: 503 });
  let commissionPercent: number;
  try {
    commissionPercent = getCommissionPercent();
  } catch (error) {
    console.error("Marketplace commission configuration is invalid.", error);
    return NextResponse.json({ error: "Marketplace checkout is not configured correctly." }, { status: 503 });
  }
  const customer = await getCurrentSession();
  if (!customer) return NextResponse.json({ error: "Sign in before checking out." }, { status: 401 });
  const parsed = cartSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Your cart could not be checked. Refresh and try again." }, { status: 400 });
  if (!process.env.APP_URL) return NextResponse.json({ error: "APP_URL must be configured before checkout." }, { status: 503 });
  await connectToDatabase();
  const approvedSellers = await User.find({ role: "seller", sellerStatus: "approved" }).distinct("_id");

  const quantities = new Map<string, number>();
  for (const item of parsed.data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  if ([...quantities.values()].some((quantity) => quantity > 20)) {
    return NextResponse.json({ error: "You can order up to 20 of each item at a time." }, { status: 400 });
  }
  const products = await Product.find({
    _id: { $in: [...quantities.keys()] },
    status: "active",
    sellerId: { $in: approvedSellers },
  }).lean();
  if (products.length !== quantities.size) {
    return NextResponse.json({ error: "One or more items are no longer available. Update your cart." }, { status: 409 });
  }

  const reservations: { id: string; quantity: number }[] = [];
  for (const product of products) {
    const quantity = quantities.get(product._id.toString())!;
    const reserved = await Product.updateOne(
      { _id: product._id, status: "active", stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
    );
    if (reserved.modifiedCount !== 1) {
      await Promise.all(reservations.map((entry) => Product.updateOne({ _id: entry.id }, { $inc: { stock: entry.quantity } })));
      return NextResponse.json({ error: `${product.name} just sold out. Please update your cart.` }, { status: 409 });
    }
    reservations.push({ id: product._id.toString(), quantity });
  }

  const lines = products.map((product) => {
    const quantity = quantities.get(product._id.toString())!;
    const split = calculateSellerSplit(product.priceCents, quantity, commissionPercent);
    return {
      productId: product._id,
      sellerId: product.sellerId,
      name: product.name,
      quantity,
      unitPriceCents: product.priceCents,
      imageUrl: product.imageUrl,
      commissionPercent,
      platformFeeCents: split.platformFeeCents,
      sellerPayoutCents: split.sellerPayoutCents,
    };
  });
  const subtotalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const shippingCents = getShippingCents(subtotalCents);
  const orderId = new Types.ObjectId();
  try {
    await Order.create({
      _id: orderId,
      customerId: customer.id,
      lines,
      totalCents: subtotalCents + shippingCents,
      currency: "usd",
    });
  } catch (error) {
    await Promise.all(reservations.map((entry) => Product.updateOne({ _id: entry.id }, { $inc: { stock: entry.quantity } })));
    throw error;
  }

  const stripe = stripeClient();
  let stripeSession: Stripe.Checkout.Session | null = null;
  try {
    stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      customer_email: customer.email,
      line_items: lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: "usd",
            unit_amount: line.unitPriceCents,
            product_data: {
              name: line.name,
              images: line.imageUrl.startsWith("https://") ? [line.imageUrl] : undefined,
            },
          },
        })),
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: shippingCents, currency: "usd" },
          display_name: shippingCents === 0 ? "Free standard shipping" : "Standard shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 5 },
          },
        },
      }],
      success_url: `${process.env.APP_URL.replace(/\/$/, "")}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL.replace(/\/$/, "")}/?checkout=cancelled&session_id={CHECKOUT_SESSION_ID}`,
      metadata: { orderId: orderId.toString() },
    });
    if (!stripeSession.url) throw new Error("Stripe did not return a Checkout URL.");
    const savedOrder = await Order.updateOne({ _id: orderId, status: "pending" }, { stripeSessionId: stripeSession.id });
    if (savedOrder.matchedCount !== 1) throw new Error("Checkout order could not be linked to the Stripe session.");
    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    if (stripeSession) {
      try {
        await stripe.checkout.sessions.expire(stripeSession.id);
      } catch (cleanupError) {
        console.error("Could not expire a Checkout session after setup failed.", { sessionId: stripeSession.id, error: cleanupError });
        return NextResponse.json({ error: "Checkout could not be safely finalized. Contact support before trying again." }, { status: 502 });
      }
    }
    await Promise.all(reservations.map((entry) => Product.updateOne({ _id: entry.id }, { $inc: { stock: entry.quantity } })));
    await Order.deleteOne({ _id: orderId, status: "pending" });
    console.error("Stripe Checkout session creation failed.", error);
    return NextResponse.json({ error: "Checkout could not start. No payment was taken; please try again." }, { status: 502 });
  }
}
