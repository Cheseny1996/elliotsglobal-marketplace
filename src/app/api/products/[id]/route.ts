import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models";
import { productSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Product management needs MongoDB configuration." }, { status: 503 });
  const seller = await requireRole("seller");
  if (!seller) return NextResponse.json({ error: "Sign in with a seller account." }, { status: 401 });
  if (seller.sellerStatus !== "approved") return NextResponse.json({ error: "Your seller account is not approved." }, { status: 403 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Product details are invalid." }, { status: 400 });
  await connectToDatabase();
  const product = await Product.findOneAndUpdate(
    { _id: id, sellerId: seller.id, status: { $ne: "archived" } },
    { ...parsed.data, status: "pending" },
    { new: true, runValidators: true },
  );
  if (!product) return NextResponse.json({ error: "Product not found or not editable." }, { status: 404 });
  return NextResponse.json({ product, message: "Changes sent for admin review." });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Product management needs MongoDB configuration." }, { status: 503 });
  const seller = await requireRole("seller");
  if (!seller) return NextResponse.json({ error: "Sign in with a seller account." }, { status: 401 });
  if (seller.sellerStatus !== "approved") return NextResponse.json({ error: "Your seller account is not approved." }, { status: 403 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  await connectToDatabase();
  const product = await Product.findOneAndUpdate(
    { _id: id, sellerId: seller.id, status: { $ne: "archived" } },
    { status: "archived" },
    { new: true },
  );
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
