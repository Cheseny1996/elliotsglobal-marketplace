import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import { Order, Product, User } from "@/lib/models";

export async function GET() {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Admin tools need MongoDB configuration." }, { status: 503 });
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await connectToDatabase();
  const [pendingSellers, pendingProducts, recentOrders, counts] = await Promise.all([
    User.find({ role: "seller", sellerStatus: "pending" }).select("name email storeName createdAt").sort({ createdAt: 1 }).limit(50).lean(),
    Product.find({ status: "pending" }).populate("sellerId", "storeName email").sort({ createdAt: 1 }).limit(100).lean(),
    Order.find().populate("customerId", "name email").populate("lines.sellerId", "storeName email").sort({ createdAt: -1 }).limit(50).lean(),
    Promise.all([
      User.countDocuments({ role: "seller", sellerStatus: "approved" }),
      Product.countDocuments({ status: "active" }),
      Order.countDocuments({ status: { $in: ["paid", "processing", "shipped", "delivered"] } }),
      Order.aggregate([{ $match: { status: { $in: ["paid", "processing", "shipped", "delivered"] } } }, { $group: { _id: null, grossCents: { $sum: "$totalCents" } } }]),
      Order.aggregate([{ $match: { status: { $in: ["paid", "processing", "shipped", "delivered"] } } }, { $unwind: "$lines" }, { $group: { _id: null, platformFeeCents: { $sum: "$lines.platformFeeCents" } } }]),
    ]),
  ]);
  return NextResponse.json({
    pendingSellers,
    pendingProducts,
    recentOrders,
    stats: {
      sellers: counts[0],
      products: counts[1],
      orders: counts[2],
      grossCents: counts[3][0]?.grossCents ?? 0,
      platformFeeCents: counts[4][0]?.platformFeeCents ?? 0,
    },
  });
}
