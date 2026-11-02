import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";

export async function GET() {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Order history needs MongoDB configuration." }, { status: 503 });
  const customer = await getCurrentSession();
  if (!customer) return NextResponse.json({ error: "Sign in to see your orders." }, { status: 401 });
  await connectToDatabase();
  const orders = await Order.find({ customerId: customer.id }).select("status totalCents createdAt lines.name lines.quantity lines.unitPriceCents lines.imageUrl shippingAddress").sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json({ orders });
}
