import Link from "next/link";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import { readActiveLeagueId, readSession } from "@/lib/session";
import { getLeaderboardRows } from "@/lib/world-cup/repository";

export default async function LeaderboardPage() {
  const locale = await readLocale();
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const { league, rows } = session
    ? await getLeaderboardRows(session.userId, activeLeagueId)
    : { league: null, rows: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t(locale, "leaderboard.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          {t(locale, "leaderboard.body")}
        </p>
      </div>

      {!league ? (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold">{t(locale, "common.noActiveLeague")}</h2>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            {t(locale, "leaderboard.noLeagueBody")}
          </p>
          <Link
            href="/leagues"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime"
          >
            {t(locale, "common.goToLeagues")}
          </Link>
        </div>
      ) : (
        <section className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
          <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
            {t(locale, "common.activeLeague")}
          </div>
          <div className="mt-1 font-display text-lg font-bold">{league.leagueName}</div>
          <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {league.gameMode === "match_scores"
              ? t(locale, "app.matchScores")
              : t(locale, "app.stagePredictions")}
          </div>
        </section>
      )}

      <div className="grid gap-3">
        {rows.map((row, index) => {
          const highlighted = index === 0;
          return (
            <details
              key={row.userId}
              className={
                "group rounded-xl p-4 " +
                (highlighted
                  ? "glass-card border-[var(--color-gold)] glow-gold"
                  : "bg-[var(--color-panel-low)]")
              }
            >
              <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-4 [&::-webkit-details-marker]:hidden">
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
                    <ScorePill label={t(locale, "leaderboard.exact")} value={row.exactScores} />
                    <ScorePill label={t(locale, "leaderboard.results")} value={row.results} />
                    <ScorePill label={t(locale, "leaderboard.stages")} value={row.stages} />
                    <ScorePill label={t(locale, "leaderboard.bonus")} value={row.bonuses} />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-[var(--color-gold)]">
                    {row.details.length > 0
                      ? t(locale, "leaderboard.openBreakdown")
                      : t(locale, "leaderboard.noEvents")}
                  </div>
                </div>
                <div className="text-end">
                  <div className="font-display text-2xl font-extrabold text-[var(--color-accent)]">
                    {row.total}
                  </div>
                  <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                    {t(locale, "common.points")}
                  </div>
                </div>
              </summary>

              <div className="mt-4 border-t border-white/10 pt-4">
                {row.details.length > 0 ? (
                  <div className="grid gap-2">
                    {row.details.map((detail, detailIndex) => (
                      <div
                        key={`${detail.sourceType}-${detail.label}-${detailIndex}`}
                        className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/10 bg-[var(--color-panel-high)] px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-bold">{detail.label}</div>
                          <div className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
                            {detail.reason} · {detail.detail}
                          </div>
                        </div>
                        <div className="text-end font-display text-lg font-extrabold text-[var(--color-accent)]">
                          +{detail.points}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-[var(--color-panel-high)] px-3 py-2 text-sm text-[var(--color-fg-muted)]">
                    {t(locale, "leaderboard.emptyDetails")}
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>

      {league && rows.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
          <h2 className="font-display text-lg font-bold">{t(locale, "leaderboard.summary")}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              label={t(locale, "leaderboard.exactScores")}
              value={rows.reduce((sum, row) => sum + row.exactScores, 0)}
            />
            <SummaryTile
              label={t(locale, "leaderboard.correctResults")}
              value={rows.reduce((sum, row) => sum + row.results, 0)}
            />
            <SummaryTile
              label={t(locale, "leaderboard.stagePicks")}
              value={rows.reduce((sum, row) => sum + row.stages, 0)}
            />
            <SummaryTile
              label={t(locale, "leaderboard.bonusPicks")}
              value={rows.reduce((sum, row) => sum + row.bonuses, 0)}
            />
          </div>
        </section>
      ) : null}

      {league && rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
          {t(locale, "leaderboard.noMembers")}
        </div>
      ) : null}
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-[var(--color-panel-highest)] px-2 py-1">
      {label} {value}
    </span>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[var(--color-panel-high)] p-3">
      <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div className="mt-1 font-display text-xl font-extrabold text-[var(--color-accent)]">
        {value}
      </div>
    </div>
  );
}
