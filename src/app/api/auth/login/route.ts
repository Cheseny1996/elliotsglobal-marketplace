import { NextResponse } from "next/server";
import { authenticateUser, createSession } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/config";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!databaseIsConfigured()) return NextResponse.json({ error: "Sign-in is not available until MongoDB is configured." }, { status: 503 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  try {
    const user = await authenticateUser(parsed.data.email.toLowerCase(), parsed.data.password);
    if (!user) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    await createSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Account sign-in failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
    });
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}
