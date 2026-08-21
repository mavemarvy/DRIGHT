"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setReady(Boolean(data.session));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && (event === "PASSWORD_RECOVERY" || session)) setReady(true);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setMessage("Your password has been updated successfully.");
    setPassword("");
    setConfirmPassword("");
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-12 text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <section className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm">
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--background)]"><LockKeyhole size={20} /></div>
            <p className="text-sm font-medium text-[var(--muted)]">DRIGHT</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a new password</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use at least 8 characters. Your reset session is temporary and scoped to this password change.</p>
          </div>

          {!ready ? (
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">This reset link is invalid, expired, or the recovery session has not been established. Request a new link and try again.</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block"><span className="mb-2 block text-sm font-medium">New password</span><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]" /></label>
              <label className="block"><span className="mb-2 block text-sm font-medium">Confirm password</span><input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--border)]" /></label>
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {message && <div role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 size={17} />{message}</div>}
              <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 font-medium text-[var(--background)] disabled:opacity-60">{saving ? <Loader2 size={18} className="animate-spin" /> : null}{saving ? "Updating password..." : "Update password"}</button>
            </form>
          )}

          <Link href="/login" className="mt-6 block text-center text-sm font-medium underline">Return to sign in</Link>
        </section>
      </div>
    </main>
  );
}
