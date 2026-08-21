"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setMessage("If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-12 text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <section className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm">
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--background)]">
              <Mail size={20} />
            </div>
            <p className="text-sm font-medium text-[var(--muted)]">DRIGHT</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reset your password</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Enter your account email and we will send you a secure password-reset link.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Email</span>
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]" placeholder="you@example.com" />
            </label>
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {message && <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 font-medium text-[var(--background)] disabled:opacity-60">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Sending reset link..." : "Send reset link"}
            </button>
          </form>

          <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium underline">
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </section>
      </div>
    </main>
  );
}
