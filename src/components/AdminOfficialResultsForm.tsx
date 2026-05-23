"use client";

import { useState } from "react";
import { teams } from "@/lib/world-cup/data";
import type { AdminOfficialResults } from "@/lib/world-cup/repository";

const stages = [
  { id: "r32", label: "Round of 32", points: 10 },
  { id: "r16", label: "Round of 16", points: 20 },
  { id: "qf", label: "Quarter-finals", points: 40 },
  { id: "sf", label: "Semi-finals", points: 80 },
  { id: "final", label: "Final", points: 120 },
  { id: "champion", label: "Champion", points: 150 },
] as const;

type StageId = (typeof stages)[number]["id"];

export function AdminOfficialResultsForm({
  initialResults,
}: {
  initialResults: AdminOfficialResults;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>(initialResults.stages);
  const [topScorer, setTopScorer] = useState(initialResults.topScorer ?? "");
  const [winner, setWinner] = useState(initialResults.tournamentWinner ?? "");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(stage: StageId, teamId: string) {
    setMessage(null);
    setError(null);
    setSelected((current) => {
      const stageTeams = current[stage] ?? [];
      const next = stageTeams.includes(teamId)
        ? stageTeams.filter((id) => id !== teamId)
        : [...stageTeams, teamId];
      return { ...current, [stage]: next };
    });
  }

  async function save(payload: unknown, key: string, successMessage: string) {
    setSaving(key);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/official-results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Server responded ${res.status}.`);
        return;
      }
      setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="glass-card rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold">Official Tournament Results</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Record official qualifiers and bonuses. Saving recalculates stage and bonus leaderboard points.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
          <span className="mb-2 block text-sm font-bold">Official top scorer</span>
          <div className="flex gap-2">
            <input
              value={topScorer}
              onChange={(event) => setTopScorer(event.target.value)}
              placeholder="Golden Boot winner"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="button"
              disabled={saving !== null || topScorer.trim().length < 2}
              onClick={() =>
                void save(
                  { kind: "top_scorer", playerName: topScorer },
                  "top_scorer",
                  "Official top scorer saved and scoring recalculated.",
                )
              }
              className="rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] disabled:opacity-60"
            >
              {saving === "top_scorer" ? "Saving..." : "Save"}
            </button>
          </div>
        </label>

        <label className="block rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
          <span className="mb-2 block text-sm font-bold">Official World Cup winner</span>
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
              onClick={() =>
                void save(
                  { kind: "tournament_winner", teamId: winner },
                  "winner",
                  "Official winner saved and scoring recalculated.",
                )
              }
              className="rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] disabled:opacity-60"
            >
              {saving === "winner" ? "Saving..." : "Save"}
            </button>
          </div>
        </label>
      </div>

      <div className="mt-5 space-y-4">
        {stages.map((stage) => {
          const picked = selected[stage.id] ?? [];
          return (
            <section key={stage.id} className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold">{stage.label}</h3>
                  <p className="text-xs font-bold uppercase text-[var(--color-gold)]">
                    {stage.points} pts per correct pick
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving !== null}
                  onClick={() =>
                    void save(
                      { kind: "stage", stage: stage.id, teamIds: picked },
                      stage.id,
                      `${stage.label} official teams saved and scoring recalculated.`,
                    )
                  }
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[#102000] disabled:opacity-60"
                >
                  {saving === stage.id ? "Saving..." : "Save Stage"}
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => {
                  const active = picked.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggle(stage.id, team.id)}
                      className={
                        "rounded-lg border px-3 py-2 text-left text-sm transition active:scale-95 " +
                        (active
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                          : "border-white/10 bg-[var(--color-panel-high)] text-[var(--color-fg-muted)]")
                      }
                    >
                      <span className="font-bold">{team.code}</span>
                      <span className="ml-2">{team.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
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
