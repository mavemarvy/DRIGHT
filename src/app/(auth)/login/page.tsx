"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-12 text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <section className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm">
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--background)]">
              <LogIn size={20} />
            </div>

            <p className="text-sm font-medium text-[var(--muted)]">DRIGHT</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Sign in to continue to your DRIGHT account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Email</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]"
                placeholder="Your password"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 font-medium text-[var(--background)] disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-[var(--foreground)] underline"
            >
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
