import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  if (!process.env.MONGODB_URI) return NextResponse.json({ user: null, demo: true });
  return NextResponse.json({ user: await getCurrentSession() });
}
