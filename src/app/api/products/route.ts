import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import { Product, User } from "@/lib/models";
import { productSchema } from "@/lib/validation";

export async function GET(request: Request) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Live product listings need MongoDB configuration." }, { status: 503 });
  await connectToDatabase();
  const { searchParams } = new URL(request.url);
  const approvedSellers = await User.find({ role: "seller", sellerStatus: "approved" }).distinct("_id");
  const filter: Record<string, unknown> = { status: "active", sellerId: { $in: approvedSellers } };
  const category = searchParams.get("category");
  if (category && category !== "All finds") filter.category = category;
  const products = await Product.find(filter).populate("sellerId", "storeName").sort({ featured: -1, createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Product management needs MongoDB configuration." }, { status: 503 });
  const seller = await requireRole("seller");
  if (!seller) return NextResponse.json({ error: "Sign in with a seller account to add a product." }, { status: 401 });
  if (seller.sellerStatus !== "approved") {
    return NextResponse.json({ error: "Your seller account needs admin approval before you can list products." }, { status: 403 });
  }
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Product details are invalid." }, { status: 400 });
  await connectToDatabase();
  const slugBase = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
  const product = await Product.create({ ...parsed.data, slug, sellerId: seller.id, status: "pending" });
  return NextResponse.json({ product, message: "Product submitted for admin review." }, { status: 201 });
}
