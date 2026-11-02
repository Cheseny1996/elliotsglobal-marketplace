"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function subscribeToResetToken(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getResetToken() {
  return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
}

export default function PasswordResetForm() {
  const token = useSyncExternalStore(subscribeToResetToken, getResetToken, () => null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") ?? "");
    if (password !== values.get("confirmPassword")) {
      setError("Those passwords don’t match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json().catch(() => null) as { message?: string; error?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error ?? "Password recovery is temporarily unavailable. Please try again later.");
      }
      setComplete(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Your password could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  if (complete) {
    return (
      <div className="reset-password-complete" role="status">
        <p>Your password has been updated securely.</p>
        <Link className="button button-dark" href="/?signin=1">Back to sign in <ArrowRight size={16} /></Link>
      </div>
    );
  }

  if (token === null) return <p>Loading your secure reset form…</p>;

  if (!/^[a-f\d]{64}$/i.test(token)) {
    return (
      <div className="reset-password-complete">
        <p className="form-error" role="alert">This reset link is missing or invalid. Request a fresh link from the sign-in screen.</p>
        <Link className="button button-dark" href="/?signin=1">Return to Elliot’s Global <ArrowRight size={16} /></Link>
      </div>
    );
  }

  return (
    <form className="reset-password-form" onSubmit={submit}>
      <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /><small>Use at least 12 characters.</small></label>
      <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-dark" disabled={busy}>{busy ? "Updating password…" : "Update password"} <ArrowRight size={16} /></button>
    </form>
  );
}
