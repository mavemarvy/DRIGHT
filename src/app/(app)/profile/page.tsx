"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Lock, Save, User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  username: string | null;
  full_name: string | null;
  full_name_public: boolean | null;
};

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile>({ username: null, full_name: null, full_name_public: false });
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [fullNamePublic, setFullNamePublic] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return setLoading(false);

      const { data } = await supabase.from("profiles").select("username,full_name,full_name_public").eq("id", userId).maybeSingle();
      const next = data ?? { username: null, full_name: null, full_name_public: false };
      setProfile(next);
      setUsername(next.username ?? "");
      setFullName(next.full_name ?? "");
      setFullNamePublic(Boolean(next.full_name_public));

      const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
      ]);
      setFollowers(followerCount ?? 0);
      setFollowing(followingCount ?? 0);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normalized)) {
      setError("Username must be 3–30 characters and use only letters, numbers, or underscores.");
      return;
    }

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.from("profiles").update({
      username: normalized,
      full_name: fullName.trim() || null,
      full_name_public: fullNamePublic,
    }).eq("id", userId);

    if (updateError) setError(updateError.message);
    else {
      setProfile({ username: normalized, full_name: fullName.trim() || null, full_name_public: fullNamePublic });
      setUsername(normalized);
      setMessage("Profile updated.");
    }
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-medium text-[var(--muted)]">Your identity</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Your username is your public DRIGHT identity. Control whether your full name is visible to other users.</p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-3"><Users size={19} /><div><p className="text-sm text-[var(--muted)]">Followers</p><p className="text-2xl font-semibold">{loading ? "—" : followers}</p></div></div>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-3"><User size={19} /><div><p className="text-sm text-[var(--muted)]">Following</p><p className="text-2xl font-semibold">{loading ? "—" : following}</p></div></div>
        </article>
      </section>

      <form onSubmit={save} className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <label className="block"><span className="mb-2 block text-sm font-medium">Username</span><div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-4"><span className="text-[var(--muted)]">@</span><input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-transparent px-2 py-3 outline-none" /></div></label>
        <label className="mt-5 block"><span className="mb-2 block text-sm font-medium">Full name</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none" placeholder="Your full name" /></label>

        <div className="mt-6 flex items-start justify-between gap-5 rounded-xl border border-[var(--border)] p-4">
          <div className="flex gap-3"><Lock size={19} className="mt-0.5" /><div><p className="text-sm font-medium">Show my full name publicly</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Your username remains public. Turn this off to keep your full name private from other users.</p></div></div>
          <button type="button" onClick={() => setFullNamePublic((value) => !value)} aria-pressed={fullNamePublic} className={`relative h-6 w-11 shrink-0 rounded-full transition ${fullNamePublic ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${fullNamePublic ? "left-6" : "left-1"}`} /></button>
        </div>

        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        <button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--background)] disabled:opacity-60">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{saving ? "Saving..." : "Save profile"}</button>
      </form>

      <p className="mt-4 text-xs text-[var(--muted)]">Current username: @{profile.username ?? "—"}</p>
    </main>
  );
}
