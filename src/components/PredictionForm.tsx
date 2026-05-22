"use client";

import { useEffect, useMemo, useState } from "react";
import { formatKickoff, getMatchLockAt, getTeam, type Match } from "@/lib/world-cup/data";
import { TeamBadge } from "@/components/world-cup/TeamBadge";

type Prediction = {
  homeScore: string;
  awayScore: string;
};

type SavedPrediction = {
  homeScore: number;
  awayScore: number;
  updatedAt: string;
};

type PredictionFormProps = {
  matches: Match[];
  initialPredictions?: Record<string, SavedPrediction>;
};

export function PredictionForm({ matches, initialPredictions = {} }: PredictionFormProps) {
  const initial = useMemo(
    () =>
      Object.fromEntries(
        matches.map((match) => {
          const saved = initialPredictions[match.id];
          return [
            match.id,
            {
              homeScore: saved ? String(saved.homeScore) : "",
              awayScore: saved ? String(saved.awayScore) : "",
            },
          ];
        }),
      ) as Record<string, Prediction>,
    [matches, initialPredictions],
  );
  const [predictions, setPredictions] = useState(initial);
  const [savedPredictions, setSavedPredictions] = useState(initialPredictions);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setPredictions((current) => ({ ...initial, ...current }));
    setSavedPredictions((current) => ({ ...initialPredictions, ...current }));
  }, [initial, initialPredictions]);

  function update(matchId: string, key: keyof Prediction, value: string) {
    setErrors((current) => ({ ...current, [matchId]: "" }));
    setPredictions((current) => ({
      ...current,
      [matchId]: {
        ...(current[matchId] ?? { homeScore: "", awayScore: "" }),
        [key]: value,
      },
    }));
  }

  async function savePrediction(matchId: string) {
    const prediction = predictions[matchId];
    if (!prediction) return;

    const homeScore = Number(prediction.homeScore);
    const awayScore = Number(prediction.awayScore);
    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      setErrors((current) => ({ ...current, [matchId]: "Enter whole-number scores first." }));
      return;
    }

    setSavingMatchId(matchId);
    setErrors((current) => ({ ...current, [matchId]: "" }));
    try {
      const res = await fetch("/api/predictions/matches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, homeScore, awayScore }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors((current) => ({
          ...current,
          [matchId]: body?.error ?? `Server responded ${res.status}.`,
        }));
        return;
      }

      setSavedPredictions((current) => ({
        ...current,
        [matchId]: {
          homeScore,
          awayScore,
          updatedAt: body?.prediction?.updatedAt ?? new Date().toISOString(),
        },
      }));
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [matchId]: err instanceof Error ? err.message : "Network error.",
      }));
    } finally {
      setSavingMatchId((current) => (current === matchId ? null : current));
    }
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const home = getTeam(match.homeTeamId)?.name ?? match.homePlaceholder ?? "TBD";
        const away = getTeam(match.awayTeamId)?.name ?? match.awayPlaceholder ?? "TBD";
        const lockAt = getMatchLockAt(match);
        const locked = Date.now() >= lockAt.getTime();
        const prediction = predictions[match.id] ?? { homeScore: "", awayScore: "" };
        const complete = prediction.homeScore !== "" && prediction.awayScore !== "";
        const savedPrediction = savedPredictions[match.id];
        const saved =
          Boolean(savedPrediction) &&
          String(savedPrediction?.homeScore) === prediction.homeScore &&
          String(savedPrediction?.awayScore) === prediction.awayScore;
        const saving = savingMatchId === match.id;
        const error = errors[match.id];
        const status = locked ? "Locked" : saved ? "Saved" : complete ? "Unsaved" : "Missing";

        return (
          <div
            key={match.id}
            className={
              "glass-card rounded-xl p-4 transition " +
              (saved ? "border-[var(--color-accent)] glow-lime" : "")
            }
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                Match {match.number} · {formatKickoff(match.kickoffAtUtc)}
              </div>
              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-bold " +
                  (locked
                    ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                    : saved
                      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : complete
                        ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
                        : "bg-[var(--color-panel-high)] text-[var(--color-fg-muted)]")
                }
              >
                {status}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <TeamBadge teamId={match.homeTeamId} label={home} />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  disabled={locked}
                  value={prediction.homeScore}
                  onChange={(event) => update(match.id, "homeScore", event.target.value)}
                  className="h-12 w-12 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] text-center font-display text-xl font-extrabold text-[var(--color-accent)] outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
                />
                <span className="font-display text-xl font-extrabold text-[var(--color-fg-muted)]">-</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  disabled={locked}
                  value={prediction.awayScore}
                  onChange={(event) => update(match.id, "awayScore", event.target.value)}
                  className="h-12 w-12 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] text-center font-display text-xl font-extrabold text-[var(--color-accent)] outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
                />
              </div>
              <TeamBadge teamId={match.awayTeamId} label={away} />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-[var(--color-fg-muted)]">
              <div>
                <span>Locks {formatKickoff(lockAt.toISOString())}</span>
                {error ? (
                  <div className="mt-1 font-semibold text-[var(--color-danger)]">{error}</div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={locked || !complete || saving}
                onClick={() => void savePrediction(match.id)}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-bold text-[#102000] transition active:scale-95 disabled:opacity-50"
              >
                {saving ? "Saving..." : saved ? "Saved" : "Save Prediction"}
              </button>
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
        Match scores are now saved to Postgres and the server enforces the 5-minute lock.
        The next build step adds league-wide visibility and scoring breakdowns.
      </div>
    </div>
  );
}
