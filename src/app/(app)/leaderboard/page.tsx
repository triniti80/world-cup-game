import { leaderboard } from "@/lib/world-cup/data";

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Leaderboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          Standings update when results and scoring events are stored. This first
          pass lays out the table and point breakdown using the tournament pulse style.
        </p>
      </div>

      <div className="grid gap-3">
        {leaderboard.map((row, index) => {
          const highlighted = index === 0;
          return (
            <article
              key={row.id}
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
                  <span>Stages {row.stage}</span>
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
    </div>
  );
}
