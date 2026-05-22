import Link from "next/link";
import { readSession } from "@/lib/session";
import { getLeaderboardRows } from "@/lib/world-cup/repository";

export default async function LeaderboardPage() {
  const session = await readSession();
  const { league, rows } = session
    ? await getLeaderboardRows(session.userId)
    : { league: null, rows: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Leaderboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          Standings for your active league, calculated from stored scoring events.
        </p>
      </div>

      {!league ? (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold">No active league</h2>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            Create or join a league before viewing standings.
          </p>
          <Link
            href="/leagues"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime"
          >
            Go to Leagues
          </Link>
        </div>
      ) : (
        <section className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
          <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">Active league</div>
          <div className="mt-1 font-display text-lg font-bold">{league.leagueName}</div>
          <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {league.gameMode === "match_scores"
              ? "Match score guessing"
              : "Pre-tournament stage prediction"}
          </div>
        </section>
      )}

      <div className="grid gap-3">
        {rows.map((row, index) => {
          const highlighted = index === 0;
          return (
            <article
              key={row.userId}
              className={
                "grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl p-4 " +
                (highlighted
                  ? "glass-card border-[var(--color-gold)] glow-gold"
                  : "bg-[var(--color-panel-low)]")
              }
            >
              <div
                className={
                  "flex h-12 w-12 items-center justify-center rounded-full font-display text-xl font-extrabold " +
                  (highlighted
                    ? "bg-[var(--color-gold)] text-[#2a1700]"
                    : "bg-[var(--color-panel-highest)] text-[var(--color-fg-muted)]")
                }
              >
                {index + 1}
              </div>
              <div>
                <div className="font-display text-lg font-bold">{row.name}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-fg-muted)]">
                  <span>Exact {row.exactScores}</span>
                  <span>Results {row.results}</span>
                  <span>Stages {row.stages}</span>
                  <span>Bonus {row.bonuses}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-extrabold text-[var(--color-accent)]">
                  {row.total}
                </div>
                <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                  points
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {league && rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
          No league members found yet.
        </div>
      ) : null}
    </div>
  );
}
