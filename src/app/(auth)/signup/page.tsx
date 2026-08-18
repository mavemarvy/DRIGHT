"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Check, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      setError("Username must be 3–30 characters and use only letters, numbers, or underscores.");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { username: normalizedUsername } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }

    setMessage("Account created. Check your email to confirm your account, then sign in.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-[var(--foreground)] sm:px-6">
      <div className="mx-auto flex min-h-[85vh] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden bg-[var(--primary)] p-10 text-[var(--background)] lg:block">
            <p className="text-sm font-semibold tracking-wide">DRIGHT</p>
            <h1 className="mt-20 text-4xl font-semibold leading-tight">Create your DRIGHT account.</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 opacity-80">Join the marketplace, discover products and services, build your store, promote listings, and grow your digital business.</p>
            <div className="mt-10 space-y-4 text-sm">
              {["One account for the DRIGHT ecosystem", "Buyer, vendor and affiliate capabilities", "Secure Supabase authentication"].map((item) => (
                <div key={item} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full border border-current"><Check size={14} /></span>{item}</div>
              ))}
            </div>
          </section>

          <section className="p-6 sm:p-9 lg:p-10">
            <div className="mb-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--background)]"><UserPlus size={20} /></div>
              <p className="text-sm font-medium text-[var(--muted)]">DRIGHT</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Create account</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Start with your basic account details. You can complete your profile later.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block"><span className="mb-2 block text-sm font-medium">Username</span><input required minLength={3} maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]" placeholder="your_username" /></label>
              <label className="block"><span className="mb-2 block text-sm font-medium">Email</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]" placeholder="you@example.com" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-2 block text-sm font-medium">Password</span><input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]" placeholder="8+ characters" /></label>
                <label className="block"><span className="mb-2 block text-sm font-medium">Confirm password</span><input required type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]" placeholder="Repeat password" /></label>
              </div>
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {message && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
              <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 font-medium text-[var(--background)] disabled:opacity-60">{loading ? <Loader2 size={18} className="animate-spin" /> : null}{loading ? "Creating account..." : "Create account"}{!loading && <ArrowRight size={18} />}</button>
            </form>
            <p className="mt-6 text-center text-sm text-[var(--muted)]">Already have an account? <Link href="/login" className="font-medium text-[var(--foreground)] underline">Sign in</Link></p>
          </section>
        </div>
      </div>
    </main>
  );
}
