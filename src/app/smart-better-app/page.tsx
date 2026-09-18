"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

type Outcome = { score: string; odds: number };
type Status = "not_placed" | "placed" | "won" | "lost";

const matchA = {
  name: "Match 1",
  short: "M1 T1–T2",
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
  name: "Match 2",
  short: "M2 T1–T2",
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
    return { id, a, b, combinedOdds, group: aIndex };
  }),
);

const STORAGE_KEY = "smart-better-app.correct-score-planner.v1";
const LEGACY_STORAGE_KEY = "dright.correct-score-planner.v1";

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SmartBetterAppPage() {
  const [stake, setStake] = useState(10);
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"all" | "undone" | "done">("all");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as {
          stake?: number;
          statuses?: Record<number, Status>;
        };

        if (typeof parsed.stake === "number" && parsed.stake > 0) {
          setStake(parsed.stake);
        }
        if (parsed.statuses) {
          setStatuses(parsed.statuses);
        }
      }
    } catch {
      // Use defaults if old local data cannot be read.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stake, statuses }));
  }, [ready, stake, statuses]);

  const isDone = (id: number) => (statuses[id] ?? "not_placed") !== "not_placed";

  const doneCount = combinations.reduce(
    (count, combo) => count + (isDone(combo.id) ? 1 : 0),
    0,
  );

  const allDone = doneCount === combinations.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return combinations.filter((combo) => {
      const done = (statuses[combo.id] ?? "not_placed") !== "not_placed";
      if (show === "done" && !done) return false;
      if (show === "undone" && done) return false;

      if (!q) return true;

      const searchable = [
        combo.id,
        matchA.short,
        combo.a.score,
        matchB.short,
        combo.b.score,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [query, show, statuses]);

  function setDone(id: number, done: boolean) {
    setStatuses((current) => ({
      ...current,
      [id]: done ? "placed" : "not_placed",
    }));
  }

  function toggleAll() {
    const next: Record<number, Status> = { ...statuses };
    for (const combo of combinations) {
      next[combo.id] = allDone ? "not_placed" : "placed";
    }
    setStatuses(next);
  }

  function exportCsv() {
    const rows = combinations.map((combo) => [
      combo.id,
      "T1 vs T2",
      combo.a.score,
      "T1 vs T2",
      combo.b.score,
      combo.combinedOdds.toFixed(4),
      stake.toFixed(2),
      (stake * combo.combinedOdds).toFixed(2),
      isDone(combo.id) ? "Done" : "Not done",
    ]);

    const header = [
      "number",
      "match_1",
      "score_1",
      "match_2",
      "score_2",
      "combined_odds",
      "stake_ngn",
      "potential_return_ngn",
      "status",
    ];

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
    <main className="min-h-screen bg-[#0d0d0e] text-white">
      <header className="sticky top-0 z-30 border-b border-[#b2000c] bg-[#e30613] shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Smart Better App</h1>
            <p className="text-xs text-white/80">
              Correct-score combinations
            </p>
          </div>

          <div className="rounded-lg bg-black/20 px-3 py-1.5 text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/70">
              Done
            </div>
            <div className="text-sm font-bold">
              {doneCount}/{combinations.length}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="rounded-xl border border-white/10 bg-[#202020] px-3 py-2.5">
            <span className="block text-[10px] uppercase tracking-wider text-[#aeb3bf]">
              Stake each
            </span>
            <div className="mt-1 flex items-center gap-1 font-semibold">
              <span>₦</span>
              <input
                type="number"
                min="1"
                step="1"
                value={stake}
                onChange={(event) =>
                  setStake(Math.max(1, Number(event.target.value) || 1))
                }
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </div>
          </label>

          <div className="rounded-xl border border-white/10 bg-[#202020] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-[#aeb3bf]">
              Total stake
            </div>
            <div className="mt-1 font-semibold">
              {money(stake * combinations.length)}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#202020] px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-[#aeb3bf]">
              Remaining
            </div>
            <div className="mt-1 font-semibold">
              {combinations.length - doneCount}
            </div>
          </div>

          <button
            onClick={exportCsv}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#202020] px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98]"
          >
            <Download size={16} />
            Export CSV
          </button>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#222223] shadow-2xl">
          <div className="border-b border-white/10 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium">Plain text</h2>
                <p className="mt-0.5 text-xs text-[#9da3af]">
                  Tap a box at the right when that combination is done.
                </p>
              </div>

              <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[#2c2c2d] px-3 py-2 text-xs font-semibold">
                <span>{allDone ? "Unmark all" : "Mark all done"}</span>
                <input
                  type="checkbox"
                  checked={allDone}
                  onChange={toggleAll}
                  className="h-5 w-5 cursor-pointer accent-[#e30613]"
                  aria-label={allDone ? "Unmark all combinations" : "Mark all combinations as done"}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8d93a0]"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search number or score..."
                  className="w-full rounded-xl border border-white/10 bg-[#181819] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#747a85] focus:border-[#e30613]"
                />
              </div>

              <div className="flex gap-1 rounded-xl bg-[#181819] p-1">
                {(["all", "undone", "done"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setShow(item)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold capitalize transition sm:flex-none ${
                      show === item
                        ? "bg-[#e30613] text-white"
                        : "text-[#aeb3bf]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-[72vh] overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#9095a1]">
                No combinations match this view.
              </div>
            ) : (
              <div>
                {filtered.map((combo, index) => {
                  const done = isDone(combo.id);
                  const previous = filtered[index - 1];
                  const startsNewGroup =
                    index > 0 && previous && previous.group !== combo.group;

                  return (
                    <div key={combo.id}>
                      {startsNewGroup && (
                        <div className="h-4" aria-hidden="true" />
                      )}

                      <label
                        className={`group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 font-mono text-[15px] leading-6 transition sm:text-[17px] ${
                          done
                            ? "bg-[#2a2a2b] text-[#777d88] line-through"
                            : "text-[#b9bfca] hover:bg-white/[0.03]"
                        }`}
                      >
                        <span className="w-10 shrink-0 text-right tabular-nums text-[#8f95a1]">
                          {combo.id}.
                        </span>

                        <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {matchA.short} {combo.a.score}
                          <span className="px-2 text-[#858b96]">+</span>
                          {matchB.short} {combo.b.score}
                        </span>

                        <input
                          type="checkbox"
                          checked={done}
                          onChange={(event) =>
                            setDone(combo.id, event.target.checked)
                          }
                          className="h-6 w-6 shrink-0 cursor-pointer accent-[#e30613]"
                          aria-label={`Mark combination ${combo.id} as done`}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#1d1d1e] px-4 py-3 text-xs text-[#8f95a1] sm:px-6">
            Showing {filtered.length} of {combinations.length} combinations · Checked items are saved on this device.
          </div>
        </section>
      </div>
    </main>
  );
}
