export function passwordResetEmailIsConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.APP_URL);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.APP_URL;
  if (!apiKey || !from || !appUrl) {
    throw new Error("Password reset email is not configured.");
  }

  const resetUrl = new URL("/reset-password", appUrl);
  resetUrl.hash = new URLSearchParams({ token }).toString();
  const link = resetUrl.toString();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Reset your Elliot’s Global password",
      html: `<p>We received a request to reset your Elliot’s Global password.</p><p><a href="${link}">Choose a new password</a></p><p>This link expires in 30 minutes and can only be used once. If you did not request this, you can ignore this email.</p>`,
      text: `We received a request to reset your Elliot’s Global password.\n\nChoose a new password: ${link}\n\nThis link expires in 30 minutes and can only be used once. If you did not request this, you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error("Resend rejected the password reset email.");
    Object.assign(error, { code: response.status });
    throw error;
  }
}
