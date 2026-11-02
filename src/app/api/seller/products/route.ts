import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models";

export async function GET() {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Seller tools need MongoDB configuration." }, { status: 503 });
  const seller = await requireRole("seller");
  if (!seller) return NextResponse.json({ error: "Sign in with a seller account." }, { status: 401 });
  await connectToDatabase();
  const products = await Product.find({ sellerId: seller.id }).sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ products, sellerStatus: seller.sellerStatus });
}
