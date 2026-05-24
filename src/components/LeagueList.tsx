"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { UserLeague } from "@/lib/world-cup/repository";

export function LeagueList({
  leagues,
  activeLeagueId,
}: {
  leagues: UserLeague[];
  activeLeagueId: number | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busyLeagueId, setBusyLeagueId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function activateLeague(leagueId: number) {
    setBusyLeagueId(leagueId);
    setError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "activate", leagueId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Server responded ${res.status}.`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.networkError"));
    } finally {
      setBusyLeagueId(null);
    }
  }

  if (leagues.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
        {t("leagues.none")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {leagues.map((league) => {
          const active = league.leagueId === activeLeagueId;
          return (
            <article key={league.leagueId} className="glass-card rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold">{league.leagueName}</h3>
                  <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                    {league.gameMode === "match_scores" ? t("app.matchScores") : t("app.stagePredictions")}
                  </p>
                </div>
                {active ? (
                  <span className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                    {t("leagues.active")}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busyLeagueId !== null}
                    onClick={() => void activateLeague(league.leagueId)}
                    className="rounded-lg bg-[var(--color-panel-highest)] px-3 py-2 text-xs font-bold text-[var(--color-gold)] transition hover:bg-[var(--color-panel-high)] disabled:opacity-60"
                  >
                    {busyLeagueId === league.leagueId ? t("leagues.switching") : t("leagues.setActive")}
                  </button>
                )}
              </div>
              <div className="mt-4 rounded-lg bg-[var(--color-panel-highest)] px-3 py-2 text-sm">
                {t("leagues.inviteCode")}:{" "}
                <span className="font-bold text-[var(--color-gold)]">{league.inviteCode}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
