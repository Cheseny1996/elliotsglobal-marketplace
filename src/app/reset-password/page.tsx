import PasswordResetForm from "@/components/password-reset-form";
import Link from "next/link";

export const metadata = {
  title: "Reset your password — Elliot’s Global",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <main className="reset-password-page">
      <section className="reset-password-card">
        <Link className="brand-mark reset-password-mark" href="/">eg<span>.</span></Link>
        <span className="eyebrow">GOOD TO HAVE YOU HERE</span>
        <h1>Choose a new password.</h1>
        <p>Make it a strong one, and you’ll be back to finding lovely things in no time.</p>
        <PasswordResetForm />
      </section>
    </main>
  );
}
