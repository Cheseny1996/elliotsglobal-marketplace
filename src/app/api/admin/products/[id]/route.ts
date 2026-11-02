import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { connectToDatabase } from "@/lib/db";
import { Product, User } from "@/lib/models";
import { z } from "zod";

const decisionSchema = z.object({ decision: z.enum(["active", "rejected"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Admin tools need MongoDB configuration." }, { status: 503 });
  if (!(await requireRole("admin"))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 });
  await connectToDatabase();
  const product = await Product.findById(id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  if (parsed.data.decision === "active") {
    const seller = await User.findOne({ _id: product.sellerId, role: "seller", sellerStatus: "approved" }).select("_id");
    if (!seller) return NextResponse.json({ error: "Approve the seller before approving their products." }, { status: 409 });
  }
  product.status = parsed.data.decision;
  await product.save();
  return NextResponse.json({ product: product.toObject() });
}
