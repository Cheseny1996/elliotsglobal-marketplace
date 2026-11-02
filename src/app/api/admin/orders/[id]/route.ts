import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models";
import { z } from "zod";

const orderUpdateSchema = z.object({
  status: z.enum(["processing", "shipped", "delivered", "cancelled"]).optional(),
  payoutSellerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  payoutStatus: z.literal("paid").optional(),
  payoutReference: z.string().trim().min(1).max(120).optional(),
}).refine((value) => value.status !== undefined || (value.payoutSellerId !== undefined && value.payoutStatus === "paid"));

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Admin tools need MongoDB configuration." }, { status: 503 });
  if (!(await requireRole("admin"))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const parsed = orderUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid order or payout status." }, { status: 400 });
  await connectToDatabase();
  const order = await Order.findById(id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (parsed.data.payoutSellerId) {
    if (!["paid", "processing", "shipped", "delivered"].includes(order.status)) {
      return NextResponse.json({ error: "Seller payouts are available only after successful payment." }, { status: 409 });
    }
    const sellerLines = order.lines.filter((line) => line.sellerId.toString() === parsed.data.payoutSellerId);
    if (!sellerLines.length) return NextResponse.json({ error: "That seller has no items in this order." }, { status: 404 });
    if (sellerLines.every((line) => line.payoutStatus === "paid")) {
      return NextResponse.json({ error: "This seller has already been paid for this order." }, { status: 409 });
    }
    if (!parsed.data.payoutReference) {
      return NextResponse.json({ error: "Enter the manual transfer reference to record this payout." }, { status: 400 });
    }
    sellerLines.forEach((line) => {
      line.payoutStatus = "paid";
      line.payoutReference = parsed.data.payoutReference;
    });
  }
  if (parsed.data.status) {
    const allowedTransitions: Record<string, string[]> = {
      paid: ["processing"],
      processing: ["shipped"],
      shipped: ["delivered"],
    };
    if (!allowedTransitions[order.status]?.includes(parsed.data.status)) {
      return NextResponse.json({ error: `Order status cannot move from ${order.status} to ${parsed.data.status}.` }, { status: 409 });
    }
    order.status = parsed.data.status;
  }
  await order.save();
  return NextResponse.json({ order });
}
