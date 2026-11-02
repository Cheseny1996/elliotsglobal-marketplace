import { NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Sign-in is not available until MongoDB is configured." }, { status: 503 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const user = await authenticateUser(parsed.data.email.toLowerCase(), parsed.data.password);
  if (!user) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  await createSession(user);
  return NextResponse.json({ user });
}
