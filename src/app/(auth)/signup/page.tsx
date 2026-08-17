"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function calculateAge(dateOfBirth: string) {
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();

  if (
    month < 0 ||
    (month === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

export default function SignupPage() {
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showFullName, setShowFullName] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      setError(
        "Username must be 3–30 characters and use only letters, numbers, and underscores."
      );
      return;
    }

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!dateOfBirth) {
      setError("Please provide your date of birth.");
      return;
    }

    const age = calculateAge(dateOfBirth);

    if (age < 0 || age > 120) {
      setError("Please provide a valid date of birth.");
      return;
    }

    if (!email.trim()) {
      setError("Please provide your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: normalizedUsername,
          full_name: fullName.trim(),
          date_of_birth: dateOfBirth,
          display_full_name_public: showFullName,
        },
      },
    });

    if (signUpError) {
      if (
        signUpError.message.toLowerCase().includes("username") ||
        signUpError.message.toLowerCase().includes("duplicate")
      ) {
        setError("That username is already in use. Please choose another.");
      } else {
        setError(signUpError.message);
      }

      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }

    setMessage(
      "Account created successfully. Check your email if confirmation is required, then sign in."
    );

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-12 text-[var(--foreground)]">
      <div className="mx-auto max-w-lg">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm">
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--background)]">
              <UserPlus size={20} />
            </div>

            <p className="text-sm font-medium text-[var(--muted)]">
              DRIGHT
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Create your account
            </h1>

            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Your username becomes your default public identity on DRIGHT.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Username
              </span>

              <input
                required
                minLength={3}
                maxLength={30}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]"
                placeholder="your_username"
              />

              <span className="mt-1 block text-xs text-[var(--muted)]">
                3–30 characters. Letters, numbers and underscores.
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Full name
              </span>

              <input
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]"
                placeholder="Your full name"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Date of birth
              </span>

              <input
                required
                type="date"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]"
              />

              <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                Your date of birth helps DRIGHT determine access to
                age-restricted capabilities. It is not automatically shown
                publicly.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-4">
              <input
                type="checkbox"
                checked={showFullName}
                onChange={(event) =>
                  setShowFullName(event.target.checked)
                }
                className="mt-1"
              />

              <span>
                <span className="block text-sm font-medium">
                  Display my full name publicly
                </span>

                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                  You can change this later. Your username remains your
                  default DRIGHT display name.
                </span>
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Email
              </span>

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
              <span className="mb-2 block text-sm font-medium">
                Password
              </span>

              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]"
                placeholder="At least 8 characters"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 font-medium text-[var(--background)] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : null}

              {loading ? "Creating account..." : "Create account"}

              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--foreground)] underline"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
