"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Check, ChevronRight, Monitor, Moon, Sun, Sparkles } from "lucide-react";

const themes = [
  { value: "light", label: "Light", description: "Clean, bright DRIGHT interface", icon: Sun },
  { value: "dark", label: "Dark", description: "Dark interface for everyday use", icon: Moon },
  { value: "dark-blue", label: "Dark Blue", description: "Deep blue workspace", icon: Sparkles },
  { value: "midnight", label: "Midnight", description: "Low-light, deep contrast interface", icon: Moon },
  { value: "high-contrast", label: "High Contrast", description: "Maximum visual contrast and accessibility", icon: Sparkles },
  { value: "system", label: "System / Auto", description: "Follow your device appearance", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-8">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">DRIGHT Settings</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1><p className="mt-2 text-sm text-[var(--muted)]">Manage your DRIGHT experience and appearance.</p></div>
      <section className="mt-7 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-contrast)]"><Sparkles size={20}/></div><div><h2 className="text-lg font-semibold">Appearance</h2><p className="mt-1 text-sm text-[var(--muted)]">Choose a DRIGHT theme. Your choice is persisted by the existing theme system.</p></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{themes.map(({value,label,description,icon:Icon})=>{const selected=mounted&&theme===value;return <button key={value} type="button" onClick={()=>setTheme(value)} aria-pressed={selected} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${selected?"border-[var(--focus)] bg-[var(--background)] ring-2 ring-[var(--focus)]/20":"border-[var(--border)] bg-[var(--background)] hover:border-[var(--focus)]"}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]"><Icon size={19}/></span><span className="min-w-0 flex-1"><span className="block font-semibold">{label}</span><span className="mt-1 block text-xs text-[var(--muted)]">{description}</span></span>{selected&&<Check size={19} aria-label="Selected"/>}</button>})}</div>
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]">Theme changes apply immediately across the application and work on mobile, tablet, iPad and desktop.</div>
      </section>
      <section className="mt-5 grid gap-3 sm:grid-cols-2"><Link href="/profile" className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-medium hover:bg-[var(--background)]">Profile settings <ChevronRight size={17} className="text-[var(--muted)]"/></Link><Link href="/help" className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-medium hover:bg-[var(--background)]">Help & support <ChevronRight size={17} className="text-[var(--muted)]"/></Link></section>
    </main>
  );
}
