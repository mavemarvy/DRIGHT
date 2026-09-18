"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Download,
  RotateCcw,
  Search,
} from "lucide-react";

type Outcome = { score: string; odds: number };
type Status = "not_placed" | "placed" | "won" | "lost";
type Filter = "all" | Status;

const matchA = {
  name: "Match 1: Team 1 vs Team 2",
  outcomes: [
    { score: "1:0", odds: 7.05 },
    { score: "2:0", odds: 9.60 },
    { score: "3:0", odds: 19.84 },
    { score: "4:0", odds: 55.38 },
    { score: "2:1", odds: 9.88 },
    { score: "3:1", odds: 20.68 },
    { score: "4:1", odds: 58.44 },
    { score: "3:2", odds: 43.65 },
    { score: "4:2", odds: 100.00 },
    { score: "4:3", odds: 100.00 },
    { score: "0:0", odds: 10.49 },
    { score: "1:1", odds: 7.17 },
    { score: "2:2", odds: 20.60 },
    { score: "3:3", odds: 100.00 },
    { score: "4:4", odds: 100.00 },
    { score: "0:1", odds: 10.55 },
    { score: "0:2", odds: 21.46 },
    { score: "1:2", odds: 14.77 },
    { score: "0:3", odds: 66.31 },
    { score: "1:3", odds: 46.21 },
    { score: "2:3", odds: 65.24 },
    { score: "0:4", odds: 100.00 },
    { score: "1:4", odds: 100.00 },
    { score: "2:4", odds: 100.00 },
    { score: "3:4", odds: 100.00 },
    { score: "Other", odds: 51.57 },
  ] satisfies Outcome[],
};

const matchB = {
  name: "Match 2: Team 1 vs Team 2",
  outcomes: [
    { score: "1:0", odds: 6.73 },
    { score: "2:0", odds: 9.80 },
    { score: "3:0", odds: 21.66 },
    { score: "4:0", odds: 64.57 },
    { score: "2:1", odds: 10.31 },
    { score: "3:1", odds: 23.04 },
    { score: "4:1", odds: 69.47 },
    { score: "3:2", odds: 49.60 },
    { score: "4:2", odds: 100.00 },
    { score: "4:3", odds: 100.00 },
    { score: "0:0", odds: 9.35 },
    { score: "1:1", odds: 7.00 },
    { score: "2:2", odds: 21.94 },
    { score: "3:3", odds: 100.00 },
    { score: "4:4", odds: 100.00 },
    { score: "0:1", odds: 9.61 },
    { score: "0:2", odds: 19.99 },
    { score: "1:2", odds: 14.72 },
    { score: "0:3", odds: 63.13 },
    { score: "1:3", odds: 47.02 },
    { score: "2:3", odds: 70.87 },
    { score: "0:4", odds: 100.00 },
    { score: "1:4", odds: 100.00 },
    { score: "2:4", odds: 100.00 },
    { score: "3:4", odds: 100.00 },
    { score: "Other", odds: 63.61 },
  ] satisfies Outcome[],
};

const combinations = matchA.outcomes.flatMap((a, aIndex) =>
  matchB.outcomes.map((b, bIndex) => {
    const id = aIndex * matchB.outcomes.length + bIndex + 1;
    const combinedOdds = Number((a.odds * b.odds).toFixed(4));
    return { id, a, b, combinedOdds };
  }),
);

const STORAGE_KEY = "smart-better-app.correct-score-planner.v1";
const LEGACY_STORAGE_KEY = "dright.correct-score-planner.v1";
const PAGE_SIZE = 40;

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: Status) {
  if (status === "not_placed") return "Not placed";
  if (status === "placed") return "Placed";
  if (status === "won") return "Won";
  return "Lost";
}

export default function BetCombinationsPage() {
  const [stake, setStake] = useState(10);
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [lastCopied, setLastCopied] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          stake?: number;
          statuses?: Record<number, Status>;
        };
        if (typeof parsed.stake === "number" && parsed.stake > 0) setStake(parsed.stake);
        if (parsed.statuses) setStatuses(parsed.statuses);
      }
    } catch {
      // Keep defaults when local data is invalid.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stake, statuses }));
  }, [ready, stake, statuses]);

  useEffect(() => setPage(1), [filter, query]);

  const getStatus = (id: number): Status => statuses[id] ?? "not_placed";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return combinations.filter((combo) => {
      const current = statuses[combo.id] ?? "not_placed";
      if (filter !== "all" && current !== filter) return false;
      if (!q) return true;
      const haystack = [
        combo.id,
        matchA.name,
        combo.a.score,
        combo.a.odds.toFixed(2),
        matchB.name,
        combo.b.score,
        combo.b.odds.toFixed(2),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [filter, query, statuses]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const placedCount = combinations.filter((combo) => getStatus(combo.id) !== "not_placed").length;
  const wonCount = combinations.filter((combo) => getStatus(combo.id) === "won").length;
  const lostCount = combinations.filter((combo) => getStatus(combo.id) === "lost").length;
  const remaining = combinations.length - placedCount;
  const totalStake = combinations.length * stake;

  function lineFor(combo: (typeof combinations)[number]) {
    return [
      `#${combo.id}`,
      `${matchA.name} — Correct Score ${combo.a.score} @ ${combo.a.odds.toFixed(2)}`,
      `${matchB.name} — Correct Score ${combo.b.score} @ ${combo.b.odds.toFixed(2)}`,
      `Stake ${money(stake)}`,
      `Combined odds ${combo.combinedOdds.toFixed(2)}`,
      `Potential return ${money(stake * combo.combinedOdds)}`,
    ].join(" | ");
  }

  async function copyCombo(combo: (typeof combinations)[number]) {
    const text = lineFor(combo);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setLastCopied(combo.id);
  }

  async function copyNextUnplaced() {
    const next = combinations.find((combo) => getStatus(combo.id) === "not_placed");
    if (!next) return;
    await copyCombo(next);
    setQuery(String(next.id));
  }

  function setStatus(id: number, status: Status) {
    setStatuses((current) => ({ ...current, [id]: status }));
  }

  function resetProgress() {
    if (!window.confirm("Reset all placement/win/loss progress?")) return;
    setStatuses({});
    setLastCopied(null);
  }

  function exportCsv() {
    const header = [
      "id",
      "match_a",
      "score_a",
      "odds_a",
      "match_b",
      "score_b",
      "odds_b",
      "combined_odds",
      "stake_ngn",
      "potential_return_ngn",
      "status",
    ];

    const rows = combinations.map((combo) => [
      combo.id,
      matchA.name,
      combo.a.score,
      combo.a.odds.toFixed(2),
      matchB.name,
      combo.b.score,
      combo.b.odds.toFixed(2),
      combo.combinedOdds.toFixed(4),
      stake.toFixed(2),
      (stake * combo.combinedOdds).toFixed(2),
      statusLabel(getStatus(combo.id)),
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "smart-better-app-combinations.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-[#1f2328]" style={{"--background":"#f4f5f7","--foreground":"#1f2328","--surface":"#ffffff","--border":"#e4e7ec","--muted":"#667085","--primary":"#e30613","--primary-contrast":"#ffffff","--accent":"#e30613"} as CSSProperties}>
      <header className="sticky top-0 z-20 border-b border-[#b8000c] bg-[#e30613] text-white shadow-sm">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg font-black">S</div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">Smart Better App</h1>
            <p className="truncate text-xs text-white/80">
              Correct-score combination planner · 676 combinations
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-[#f0c3c7] bg-white p-5 shadow-sm sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-[#e30613]">Current pair</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {matchA.name} + {matchB.name}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                Every displayed correct-score option, including “Other”, is paired with
                every option from the second match. Progress stays on this device.
              </p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Stake per ticket
              </span>
              <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-3">
                <span className="text-sm text-[var(--muted)]">₦</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stake}
                  onChange={(event) => setStake(Math.max(1, Number(event.target.value) || 1))}
                  className="w-28 bg-transparent px-2 py-3 outline-none"
                />
              </div>
            </label>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Combinations", combinations.length],
              ["Total stake", money(totalStake)],
              ["Placed/settled", placedCount],
              ["Remaining", remaining],
              ["Won / Lost", `${wonCount} / ${lostCount}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="text-xs text-[var(--muted)]">{label}</div>
                <div className="mt-1 text-lg font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search #, score or odds…"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-3 pl-10 pr-3 text-sm outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {(["all", "not_placed", "placed", "won", "lost"] as Filter[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm ${
                    filter === item
                      ? "border-[#e30613] bg-[#e30613] text-white"
                      : "border-[var(--border)] bg-[var(--background)]"
                  }`}
                >
                  {item === "all" ? "All" : statusLabel(item)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyNextUnplaced}
                disabled={remaining === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#e30613] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c9000f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Clipboard size={17} />
                Copy next unplaced
              </button>
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm"
              >
                <Download size={17} />
                CSV
              </button>
              <button
                onClick={resetProgress}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm"
              >
                <RotateCcw size={17} />
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#f0c3c7] bg-[#fff5f6] px-4 py-3 text-xs leading-5 text-[#7a2a31]">
            Smart Better App copies and tracks combinations only. It does not sign in to a bookmaker,
            click selections, or submit real-money bets.
          </div>
        </section>

        <section className="mt-5 space-y-3">
          {visible.map((combo) => {
            const current = getStatus(combo.id);
            const copied = lastCopied === combo.id;
            return (
              <article
                key={combo.id}
                className={`rounded-2xl border p-4 sm:p-5 ${
                  copied
                    ? "border-[var(--accent)] bg-[var(--surface)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm font-semibold">
                      {combo.id}
                    </div>
                    <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-[var(--muted)]">{matchA.name}</div>
                        <div className="mt-1 text-lg font-semibold">
                          {combo.a.score} <span className="text-sm font-normal text-[var(--muted)]">@ {combo.a.odds.toFixed(2)}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--muted)]">{matchB.name}</div>
                        <div className="mt-1 text-lg font-semibold">
                          {combo.b.score} <span className="text-sm font-normal text-[var(--muted)]">@ {combo.b.odds.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[390px]">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
                      <div className="text-[11px] text-[var(--muted)]">Combined odds</div>
                      <div className="mt-0.5 font-semibold">{combo.combinedOdds.toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
                      <div className="text-[11px] text-[var(--muted)]">Stake</div>
                      <div className="mt-0.5 font-semibold">{money(stake)}</div>
                    </div>
                    <div className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 sm:col-span-1">
                      <div className="text-[11px] text-[var(--muted)]">Potential return</div>
                      <div className="mt-0.5 font-semibold">{money(stake * combo.combinedOdds)}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:w-[330px] lg:justify-end">
                    <button
                      onClick={() => copyCombo(combo)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copied" : "Copy"}
                    </button>

                    <select
                      value={current}
                      onChange={(event) => setStatus(combo.id, event.target.value as Status)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    >
                      <option value="not_placed">Not placed</option>
                      <option value="placed">Placed</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>
              </article>
            );
          })}

          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
              No combinations match this filter.
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[var(--muted)]">
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span className="px-2 text-sm">
              {safePage} / {pageCount}
            </span>
            <button
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={safePage >= pageCount}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
