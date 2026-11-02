import { NextResponse } from "next/server";
import { createSession, registerUser } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Account creation is not available until MongoDB is configured." }, { status: 503 });
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details and try again." }, { status: 400 });
  }
  try {
    const user = await registerUser({
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
    });
    await createSession(user);
    return NextResponse.json({
      user,
      message: user.role === "seller" ? "Account created. Your seller profile is waiting for admin approval." : "Welcome to Elliot’s Global.",
    }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    console.error("Account registration failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
    });
    return NextResponse.json(
      { error: "Account creation is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}
