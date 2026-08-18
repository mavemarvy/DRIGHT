"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COOKIE_KEY = "dright_cookie_consent_v1";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(COOKIE_KEY));
  }, []);

  function choose(value: "accepted" | "essential") {
    localStorage.setItem(COOKIE_KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-[var(--border)] bg-[var(--surface)]/95 p-4 shadow-2xl backdrop-blur sm:p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p className="font-semibold">Your privacy matters</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            DRIGHT uses essential cookies and local storage to keep the platform secure and functional. Optional cookies may help us improve the experience. Read our <Link href="/privacy" className="font-medium underline">Privacy Policy</Link> and <Link href="/cookies" className="font-medium underline">Cookie Policy</Link>.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button onClick={() => choose("essential")} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium">Essential only</button>
          <button onClick={() => choose("accepted")} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--background)]">Accept cookies</button>
        </div>
      </div>
    </div>
  );
}
