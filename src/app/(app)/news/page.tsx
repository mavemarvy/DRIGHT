"use client";

import { useState } from "react";
import { Bell, Megaphone, Newspaper, Sparkles, X } from "lucide-react";

type NewsCategory = "All" | "News" | "Promo" | "Update";

const categories: NewsCategory[] = ["All", "News", "Promo", "Update"];

function CategoryPill({ label, active, onClick }: { label: NewsCategory; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-transparent bg-[#4353FF] text-white shadow-[0_8px_24px_rgba(67,83,255,0.28)]"
          : "border-neutral-700 bg-[#1E2331] text-neutral-300 hover:border-neutral-500 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("News");
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0D1017] text-white">
      <div className="mx-auto w-full max-w-6xl">
        {showWelcome && (
          <section className="relative flex items-start gap-3 border-b border-neutral-800 bg-[#141822] px-4 py-4 sm:px-6">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1E2331] text-[#6370FF]">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#1E2331] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#7380FF]">NEW</span>
                <p className="truncate text-sm font-semibold">Welcome to DRIGHT Marketplace</p>
              </div>
              <p className="mt-1 text-xs leading-5 text-neutral-400">
                Discover digital products, services, opportunities, creators, stores and communities worldwide.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWelcome(false)}
              aria-label="Dismiss welcome message"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300"
            >
              <X size={16} />
            </button>
          </section>
        )}

        <section className="relative overflow-hidden border-b border-neutral-800 bg-gradient-to-b from-[#141822] via-[#10141d] to-[#0D1017] px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-30 [background-image:radial-gradient(circle_at_center,rgba(99,112,255,0.38)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="pointer-events-none absolute right-8 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-[#4353FF]/15 blur-3xl" />

          <div className="relative grid items-center gap-7 md:grid-cols-[auto_1fr] md:gap-10">
            <div className="flex items-center gap-5 sm:gap-7">
              <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-[28px] border border-white/10 bg-gradient-to-br from-neutral-700 via-neutral-900 to-black shadow-[0_18px_45px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.14)] sm:h-28 sm:w-28 sm:rounded-[32px]">
                <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/10 to-transparent" />
                <span className="relative bg-gradient-to-b from-white via-neutral-200 to-neutral-500 bg-clip-text text-6xl font-black leading-none text-transparent drop-shadow-[0_8px_10px_rgba(0,0,0,0.75)] sm:text-7xl">
                  D
                </span>
              </div>

              <div className="md:hidden">
                <Megaphone className="mb-2 h-9 w-9 text-neutral-300" strokeWidth={1.6} />
                <h1 className="text-4xl font-extrabold tracking-tight">News</h1>
              </div>
            </div>

            <div className="min-w-0">
              <div className="hidden items-center gap-3 md:flex">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-neutral-200">
                  <Megaphone size={27} strokeWidth={1.7} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A94FF]">DRIGHT stories</p>
                  <h1 className="mt-1 text-5xl font-extrabold tracking-tight">News</h1>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-300 sm:text-base">
                Latest DRIGHT stories, product news, promotions and platform updates.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-800 bg-[#0F1219]/95 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => (
              <CategoryPill
                key={category}
                label={category}
                active={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              />
            ))}
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-dashed border-neutral-800 bg-[#10141c]/70 px-6 py-14 text-center shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
            <div className="grid h-20 w-20 place-items-center rounded-3xl border border-neutral-800 bg-[#141822] text-neutral-700">
              {activeCategory === "Promo" ? <Megaphone size={38} strokeWidth={1.15} /> : activeCategory === "Update" ? <Bell size={38} strokeWidth={1.15} /> : <Newspaper size={38} strokeWidth={1.15} />}
            </div>
            <h2 className="mt-6 text-lg font-semibold text-neutral-500">
              No {activeCategory === "All" ? "news" : activeCategory.toLowerCase()} available.
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-600">
              Published DRIGHT stories, promotions and platform updates will appear here.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
