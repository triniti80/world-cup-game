"use client";

import { useState } from "react";
import {
  formatKickoff,
  getMatchName,
  type Match,
} from "@/lib/world-cup/data";
import type { SeededMatchWithResult } from "@/lib/world-cup/repository";

type DraftResult = {
  homeScore: string;
  awayScore: string;
};

export function AdminResultsForm({ matches }: { matches: SeededMatchWithResult[] }) {
  const [drafts, setDrafts] = useState<Record<number, DraftResult>>(
    Object.fromEntries(
      matches.map((match) => [
        match.dbId,
        {
          homeScore: match.homeScore === undefined ? "" : String(match.homeScore),
          awayScore: match.awayScore === undefined ? "" : String(match.awayScore),
        },
      ]),
    ),
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  function update(matchDbId: number, key: keyof DraftResult, value: string) {
    setErrors((current) => ({ ...current, [matchDbId]: "" }));
    setStatuses((current) => ({ ...current, [matchDbId]: "" }));
    setDrafts((current) => ({
      ...current,
      [matchDbId]: {
        ...(current[matchDbId] ?? { homeScore: "", awayScore: "" }),
        [key]: value,
      },
    }));
  }

  async function save(match: SeededMatchWithResult) {
    const draft = drafts[match.dbId];
    if (!draft) return;
    const homeScore = Number(draft.homeScore);
    const awayScore = Number(draft.awayScore);
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      setErrors((current) => ({ ...current, [match.dbId]: "Enter valid whole-number scores." }));
      return;
    }

    setSaving(match.dbId);
    setErrors((current) => ({ ...current, [match.dbId]: "" }));
    setStatuses((current) => ({ ...current, [match.dbId]: "" }));
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchDbId: match.dbId,
          homeScore,
          awayScore,
          status: "final",
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors((current) => ({
          ...current,
          [match.dbId]: body?.error ?? `Server responded ${res.status}.`,
        }));
        return;
      }
      setStatuses((current) => ({ ...current, [match.dbId]: "Final score saved and scoring recalculated." }));
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [match.dbId]: err instanceof Error ? err.message : "Network error.",
      }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="glass-card rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold">Admin Results</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Enter final scores for seeded fixtures. Saving a final score recalculates score-prediction points.
        </p>
      </div>

      <div className="space-y-3">
        {matches.map((match) => {
          const draft = drafts[match.dbId] ?? { homeScore: "", awayScore: "" };
          const error = errors[match.dbId];
          const status = statuses[match.dbId];
          return (
            <article
              key={match.dbId}
              className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                    Match {match.number} · {formatKickoff(match.kickoffAtUtc)}
                  </div>
                  <h3 className="mt-1 font-display text-base font-bold">
                    {getMatchName(match as Match)}
                  </h3>
                </div>
                <span className="rounded-full bg-[var(--color-panel-highest)] px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
                  {match.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={draft.homeScore}
                  onChange={(event) => update(match.dbId, "homeScore", event.target.value)}
                  className="h-11 w-16 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] text-center font-display text-lg font-extrabold text-[var(--color-accent)] outline-none focus:border-[var(--color-accent)]"
                  aria-label={`Home score for match ${match.number}`}
                />
                <span className="font-display text-lg font-bold text-[var(--color-fg-muted)]">-</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={draft.awayScore}
                  onChange={(event) => update(match.dbId, "awayScore", event.target.value)}
                  className="h-11 w-16 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] text-center font-display text-lg font-extrabold text-[var(--color-accent)] outline-none focus:border-[var(--color-accent)]"
                  aria-label={`Away score for match ${match.number}`}
                />
                <button
                  type="button"
                  disabled={saving !== null}
                  onClick={() => void save(match)}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[#102000] disabled:opacity-60"
                >
                  {saving === match.dbId ? "Saving..." : "Save Final"}
                </button>
              </div>

              {(error || status) && (
                <div
                  className={
                    "mt-3 rounded-lg border px-3 py-2 text-sm " +
                    (error
                      ? "border-[var(--color-danger)] bg-[var(--color-danger)]/10"
                      : "border-[var(--color-accent)] bg-[var(--color-accent)]/10")
                  }
                >
                  {error ?? status}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
