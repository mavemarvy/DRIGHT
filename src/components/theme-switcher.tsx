"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { useTheme } from "next-themes";

const themes = [
  ["system", "System Default"],
  ["light", "Light"],
  ["dark", "Dark"],
  ["dark-blue", "Dark Blue"],
  ["midnight", "Midnight / AMOLED"],
  ["ocean", "Ocean Blue"],
  ["slate", "Slate / Graphite"],
  ["high-contrast", "High Contrast"],
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <button aria-label="Theme" className="rounded-xl p-2 text-[var(--muted)]"><Palette size={18}/></button>;
  return (
    <label className="relative inline-flex items-center" title="Theme">
      <Palette size={18} className="pointer-events-none absolute left-2 text-[var(--muted)]" />
      <select value={theme ?? "system"} onChange={e => setTheme(e.target.value)} aria-label="Theme" className="w-10 cursor-pointer appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-8 pr-2 text-xs text-[var(--foreground)] outline-none sm:w-auto sm:pr-3">
        {themes.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
}
