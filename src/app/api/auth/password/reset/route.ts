import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models";
import { databaseIsConfigured } from "@/lib/config";
import { passwordResetSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!databaseIsConfigured()) {
    return NextResponse.json({ error: "Password recovery is not available until MongoDB is configured." }, { status: 503 });
  }

  const parsed = passwordResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Use a valid reset link and a password of at least 12 characters." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const passwordHash = await hash(parsed.data.password, 12);
    const result = await User.updateOne(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      },
      {
        $set: { passwordHash },
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetExpiresAt: 1,
          passwordResetRequestedAt: 1,
        },
      },
    );
    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "This password reset link is invalid or has expired. Request a new one." }, { status: 400 });
    }
    return NextResponse.json({ message: "Your password has been updated. You can now sign in." });
  } catch (error) {
    console.error("Password reset failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
    });
    return NextResponse.json(
      { error: "Your password could not be updated right now. Please try again later." },
      { status: 503 },
    );
  }
}
