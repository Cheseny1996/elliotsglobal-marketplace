import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { passwordResetEmailIsConfigured, sendPasswordResetEmail } from "@/lib/password-reset-email";
import { User } from "@/lib/models";
import { databaseIsConfigured } from "@/lib/config";
import { passwordResetRequestSchema } from "@/lib/validation";

const genericResponse = {
  message: "If an account exists for that email, we’ll send a password reset link shortly.",
};
const requestCooldownMs = 60_000;
const resetTokenLifetimeMs = 30 * 60_000;

export async function POST(request: Request) {
  if (!databaseIsConfigured()) {
    return NextResponse.json({ error: "Password recovery is not available until MongoDB is configured." }, { status: 503 });
  }
  if (!passwordResetEmailIsConfigured()) {
    return NextResponse.json({ error: "Password recovery email is not configured yet. Please contact support." }, { status: 503 });
  }

  const parsed = passwordResetRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the email address for your account." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const now = new Date();
    const cooldownCutoff = new Date(now.getTime() - requestCooldownMs);
    const email = parsed.data.email.toLowerCase();
    const user = await User.findOne({ email }).select("+passwordResetRequestedAt");
    if (!user || (user.passwordResetRequestedAt && user.passwordResetRequestedAt > cooldownCutoff)) {
      return NextResponse.json(genericResponse);
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const reservation = await User.updateOne(
      {
        _id: user._id,
        $or: [
          { passwordResetRequestedAt: { $exists: false } },
          { passwordResetRequestedAt: { $lte: cooldownCutoff } },
        ],
      },
      {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: new Date(now.getTime() + resetTokenLifetimeMs),
          passwordResetRequestedAt: now,
        },
      },
    );
    if (reservation.modifiedCount === 0) return NextResponse.json(genericResponse);

    try {
      await sendPasswordResetEmail(email, token);
    } catch (error) {
      await User.updateOne(
        { _id: user._id, passwordResetTokenHash: tokenHash },
        { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } },
      );
      console.error("Password reset email delivery failed.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorCode: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
      });
    }
    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("Password reset request failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
    });
    return NextResponse.json(
      { error: "Password recovery is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
