import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";
import { z } from "zod";

const cancelSchema = z.object({ sessionId: z.string().regex(/^cs_(?:test_|live_)?[A-Za-z0-9_]+$/) });

export async function POST(request: Request) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Checkout cancellation needs MongoDB configuration." }, { status: 503 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Checkout cancellation needs Stripe configuration." }, { status: 503 });
  const customer = await getCurrentSession();
  if (!customer) return NextResponse.json({ error: "Sign in to update this checkout." }, { status: 401 });
  const parsed = cancelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Checkout session is invalid." }, { status: 400 });
  await connectToDatabase();
  const order = await Order.findOne({
    customerId: customer.id,
    stripeSessionId: parsed.data.sessionId,
    status: "pending",
    inventoryReleased: false,
  }).select("_id");
  if (!order) return NextResponse.json({ error: "No pending order was found for this checkout." }, { status: 404 });
  try {
    await new Stripe(process.env.STRIPE_SECRET_KEY).checkout.sessions.expire(parsed.data.sessionId);
  } catch (error) {
    console.error("Could not expire the cancelled Stripe Checkout session.", { sessionId: parsed.data.sessionId, error });
    return NextResponse.json({ error: "We couldn’t close that checkout. Its stock hold will expire automatically." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
