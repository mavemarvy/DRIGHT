"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Lock, Save, User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  full_name_visibility: "PUBLIC" | "PRIVATE";
};

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile>({ user_id: "", username: null, full_name: null, full_name_visibility: "PRIVATE" });
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [fullNameVisibility, setFullNameVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data }, { data: auth }] = await Promise.all([
        supabase.rpc("get_my_identity"),
        supabase.auth.getUser(),
      ]);
      const next = (data?.[0] as Profile | undefined) ?? { user_id: auth.user?.id ?? "", username: null, full_name: null, full_name_visibility: "PRIVATE" as const };
      setProfile(next);
      setUsername(next.username ?? "");
      setFullName(next.full_name ?? "");
      setFullNameVisibility(next.full_name_visibility ?? "PRIVATE");

      const userId = auth.user?.id;
      if (userId) {
        const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
          supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
          supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
        ]);
        setFollowers(followerCount ?? 0);
        setFollowing(followingCount ?? 0);
      }
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
    const { data, error: updateError } = await supabase.rpc("update_my_identity", {
      p_username: normalized,
      p_full_name: fullName.trim() || null,
      p_full_name_visibility: fullNameVisibility,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      const next = data?.[0] as Profile | undefined;
      if (next) {
        setProfile(next);
        setUsername(next.username ?? "");
        setFullName(next.full_name ?? "");
        setFullNameVisibility(next.full_name_visibility ?? "PRIVATE");
      }
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
        <label className="block"><span className="mb-2 block text-sm font-medium">Username</span><div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-4"><span className="text-[var(--muted)]">@</span><input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-transparent px-2 py-3 outline-none" autoComplete="username" /></div><span className="mt-2 block text-xs text-[var(--muted)]">This is the identity other users search for and see publicly.</span></label>
        <label className="mt-5 block"><span className="mb-2 block text-sm font-medium">Full name</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none" placeholder="Your full name" autoComplete="name" /></label>

        <div className="mt-6 rounded-xl border border-[var(--border)] p-4">
          <div className="flex items-start gap-3"><Lock size={19} className="mt-0.5" /><div><p className="text-sm font-medium">Full-name visibility</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Your username always remains public. Your full name is shown to other users only when you choose PUBLIC.</p></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setFullNameVisibility("PUBLIC")} aria-pressed={fullNameVisibility === "PUBLIC"} className={`rounded-xl border px-4 py-3 text-left text-sm ${fullNameVisibility === "PUBLIC" ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)]"}`}>
              <span className="font-medium">PUBLIC</span><span className="mt-1 block text-xs text-[var(--muted)]">Show your full name on public-facing identity surfaces.</span>
            </button>
            <button type="button" onClick={() => setFullNameVisibility("PRIVATE")} aria-pressed={fullNameVisibility === "PRIVATE"} className={`rounded-xl border px-4 py-3 text-left text-sm ${fullNameVisibility === "PRIVATE" ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)]"}`}>
              <span className="font-medium">PRIVATE</span><span className="mt-1 block text-xs text-[var(--muted)]">Keep your full name hidden from other users.</span>
            </button>
          </div>
        </div>

        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        <button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--background)] disabled:opacity-60">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{saving ? "Saving..." : "Save profile"}</button>
      </form>

      <p className="mt-4 text-xs text-[var(--muted)]">Current username: @{profile.username ?? "—"}</p>
    </main>
  );
}
