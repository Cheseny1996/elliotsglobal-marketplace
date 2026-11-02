import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import { Order, Product } from "@/lib/models";

export async function GET() {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Seller tools need MongoDB configuration." }, { status: 503 });
  const seller = await requireRole("seller");
  if (!seller) return NextResponse.json({ error: "Sign in with a seller account." }, { status: 401 });
  await connectToDatabase();
  const [products, orders] = await Promise.all([
    Product.find({ sellerId: seller.id }).sort({ updatedAt: -1 }).limit(200).lean(),
    Order.find({ "lines.sellerId": seller.id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  const sales = orders.flatMap((order) => order.lines
    .filter((line) => line.sellerId.toString() === seller.id)
    .map((line) => ({ ...line, orderId: order._id.toString(), orderStatus: order.status, createdAt: order.createdAt })));
  return NextResponse.json({
    sellerStatus: seller.sellerStatus,
    products,
    sales,
    stats: {
      activeProducts: products.filter((product) => product.status === "active").length,
      pendingProducts: products.filter((product) => product.status === "pending").length,
      unitsSold: sales.filter((sale) => !["pending", "expired", "cancelled"].includes(sale.orderStatus)).reduce((sum, sale) => sum + sale.quantity, 0),
      grossCents: sales.filter((sale) => !["pending", "expired", "cancelled"].includes(sale.orderStatus)).reduce((sum, sale) => sum + sale.unitPriceCents * sale.quantity, 0),
      earningsCents: sales.filter((sale) => !["pending", "expired", "cancelled"].includes(sale.orderStatus)).reduce((sum, sale) => sum + sale.sellerPayoutCents, 0),
    },
  });
}
