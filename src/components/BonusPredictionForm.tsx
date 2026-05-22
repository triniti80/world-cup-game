"use client";

import { useState } from "react";
import { teams } from "@/lib/world-cup/data";
import type { LeagueGameMode, SavedBonusPredictions } from "@/lib/world-cup/repository";

type BonusPredictionFormProps = {
  gameMode: LeagueGameMode;
  initialPredictions: SavedBonusPredictions;
};

export function BonusPredictionForm({ gameMode, initialPredictions }: BonusPredictionFormProps) {
  const [topScorer, setTopScorer] = useState(initialPredictions.topScorer?.playerName ?? "");
  const [winner, setWinner] = useState(initialPredictions.tournamentWinner?.teamId ?? "");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(payload: unknown, key: string) {
    setSaving(key);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/predictions/bonus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Server responded ${res.status}.`);
        return;
      }
      setMessage("Bonus pick saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="glass-card rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Pre-tournament Bonus Picks</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            These picks lock 1 hour before the first World Cup match.
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-gold)]/15 px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
          100 pts each
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Top scorer</span>
          <div className="flex gap-2">
            <input
              value={topScorer}
              onChange={(event) => setTopScorer(event.target.value)}
              placeholder="Player name"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="button"
              disabled={saving !== null || topScorer.trim().length < 2}
              onClick={() => void save({ type: "top_scorer", playerName: topScorer }, "top_scorer")}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] disabled:opacity-60"
            >
              {saving === "top_scorer" ? "Saving..." : "Save"}
            </button>
          </div>
        </label>

        {gameMode === "match_scores" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">World Cup winner</span>
            <div className="flex gap-2">
              <select
                value={winner}
                onChange={(event) => setWinner(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)]"
              >
                <option value="">Choose team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={saving !== null || !winner}
                onClick={() => void save({ type: "tournament_winner", teamId: winner }, "winner")}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] disabled:opacity-60"
              >
                {saving === "winner" ? "Saving..." : "Save"}
              </button>
            </div>
          </label>
        ) : null}
      </div>

      {(message || error) && (
        <div
          className={
            "mt-4 rounded-lg border px-3 py-2 text-sm " +
            (error
              ? "border-[var(--color-danger)] bg-[var(--color-danger)]/10"
              : "border-[var(--color-accent)] bg-[var(--color-accent)]/10")
          }
        >
          {error ?? message}
        </div>
      )}
    </section>
  );
}
