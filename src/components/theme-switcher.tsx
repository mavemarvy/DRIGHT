"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export const DRIGHT_THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "dark-blue", label: "Dark Blue" },
  { value: "midnight", label: "Midnight" },
  { value: "high-contrast", label: "High Contrast" },
  { value: "system", label: "System / Auto" },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm">
      <span className="sr-only">Theme</span>
      <select
        value={theme ?? "system"}
        onChange={(event) => setTheme(event.target.value)}
        className="max-w-[140px] bg-transparent outline-none"
        aria-label="Select DRIGHT theme"
      >
        {DRIGHT_THEMES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
