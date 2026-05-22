"use client";

import { useState } from "react";
import { teams } from "@/lib/world-cup/data";
import type { SavedStagePredictions } from "@/lib/world-cup/repository";

const stages = [
  { id: "r32", label: "Round of 32", expected: 32 },
  { id: "r16", label: "Round of 16", expected: 16 },
  { id: "qf", label: "Quarter-finals", expected: 8 },
  { id: "sf", label: "Semi-finals", expected: 4 },
  { id: "final", label: "Final", expected: 2 },
  { id: "champion", label: "Champion", expected: 1 },
] as const;

type StageId = (typeof stages)[number]["id"];

export function StagePredictionForm({
  initialPredictions,
}: {
  initialPredictions: SavedStagePredictions;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>(initialPredictions);
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedStage, setSavedStage] = useState<string | null>(null);

  function toggle(stage: StageId, teamId: string) {
    setErrors((current) => ({ ...current, [stage]: "" }));
    setSavedStage(null);
    setSelected((current) => {
      const stageTeams = current[stage] ?? [];
      const next = stageTeams.includes(teamId)
        ? stageTeams.filter((id) => id !== teamId)
        : [...stageTeams, teamId];
      return { ...current, [stage]: next };
    });
  }

  async function saveStage(stage: StageId) {
    setSaving(stage);
    setSavedStage(null);
    setErrors((current) => ({ ...current, [stage]: "" }));
    try {
      const res = await fetch("/api/predictions/stages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage, teamIds: selected[stage] ?? [] }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors((current) => ({
          ...current,
          [stage]: body?.error ?? `Server responded ${res.status}.`,
        }));
        return;
      }
      setSavedStage(stage);
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [stage]: err instanceof Error ? err.message : "Network error.",
      }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      {stages.map((stage) => {
        const picked = selected[stage.id] ?? [];
        return (
          <section key={stage.id} className="glass-card rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">{stage.label}</h2>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  Pick {stage.expected} teams when the full tournament data is loaded. Current seed has {teams.length} teams.
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-panel-high)] px-3 py-1 text-xs font-bold">
                {picked.length} selected
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="text-sm">
                {errors[stage.id] ? (
                  <span className="font-semibold text-[var(--color-danger)]">{errors[stage.id]}</span>
                ) : savedStage === stage.id ? (
                  <span className="font-semibold text-[var(--color-accent)]">Saved</span>
                ) : (
                  <span className="text-[var(--color-fg-muted)]">Locks 1 hour before Match 1</span>
                )}
              </div>
              <button
                type="button"
                disabled={saving !== null}
                onClick={() => void saveStage(stage.id)}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[#102000] disabled:opacity-60"
              >
                {saving === stage.id ? "Saving..." : `Save ${stage.label}`}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
