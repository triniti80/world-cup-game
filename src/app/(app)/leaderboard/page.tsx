import Link from "next/link";
import { LeaderboardSelector } from "@/components/LeaderboardSelector";
import { t, type Locale } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import { readActiveLeagueId, readSession } from "@/lib/session";
import {
  getAllLeaderboardTables,
  getLeaderboardRows,
  getUserLeagues,
  type LeaderboardRow,
  type LeagueGameMode,
} from "@/lib/world-cup/repository";

type LeaderboardPageProps = {
  searchParams?: Promise<{ league?: string }>;
};

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const locale = await readLocale();
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const params = await searchParams;
  const selectedParam = params?.league;
  const leagues = session ? await getUserLeagues(session.userId) : [];
  const requestedLeagueId =
    selectedParam && selectedParam !== "all" ? Number(selectedParam) : null;
  const requestedAll = selectedParam === "all";
  const selectedLeagueId = requestedAll
    ? null
    : Number.isInteger(requestedLeagueId)
      ? requestedLeagueId
      : activeLeagueId ?? leagues[0]?.leagueId ?? null;
  const selectedLeague = selectedLeagueId
    ? leagues.find((league) => league.leagueId === selectedLeagueId)
    : null;
  const selectedValue = selectedLeague ? String(selectedLeague.leagueId) : "all";

  const singleLeagueData =
    session && selectedLeague
      ? await getLeaderboardRows(session.userId, selectedLeague.leagueId)
      : { league: null, rows: [] };
  const allTables =
    session && selectedValue === "all" ? await getAllLeaderboardTables(session.userId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t(locale, "leaderboard.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          {t(locale, "leaderboard.body")}
        </p>
      </div>

      {leagues.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
          <LeaderboardSelector
            selectedValue={selectedValue}
            allLabel={t(locale, "leaderboard.allLeagues")}
            label={t(locale, "leaderboard.selectLeague")}
            leagues={leagues.map((league) => ({
              leagueId: league.leagueId,
              leagueName: league.leagueName,
              gameModeLabel: gameModeLabel(league.gameMode, locale),
            }))}
          />
        </section>
      ) : null}

      {session && leagues.length === 0 ? (
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
      ) : null}

      {selectedValue === "all" ? (
        <div className="space-y-6">
          {allTables.map((table) => (
            <LeaderboardTable
              key={table.gameMode}
              title={
                table.gameMode === "match_scores"
                  ? t(locale, "leaderboard.matchScoresTable")
                  : t(locale, "leaderboard.stagePredictionsTable")
              }
              rows={table.rows}
              locale={locale}
              showLeagueNames
            />
          ))}
        </div>
      ) : singleLeagueData.league ? (
        <>
          <section className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
            <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
              {t(locale, "common.activeLeague")}
            </div>
            <div className="mt-1 font-display text-lg font-bold">
              {singleLeagueData.league.leagueName}
            </div>
            <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
              {gameModeLabel(singleLeagueData.league.gameMode, locale)}
            </div>
          </section>

          <LeaderboardTable
            title={singleLeagueData.league.leagueName}
            rows={singleLeagueData.rows}
            locale={locale}
          />
        </>
      ) : null}
    </div>
  );
}

function LeaderboardTable({
  title,
  rows,
  locale,
  showLeagueNames = false,
}: {
  title: string;
  rows: LeaderboardRow[];
  locale: Locale;
  showLeagueNames?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          {t(locale, "leaderboard.clickPlayer")}
        </p>
      </div>

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
                            {showLeagueNames && detail.leagueName ? ` · ${detail.leagueName}` : ""}
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

      {rows.length > 0 ? (
        <section className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
          <h3 className="font-display text-lg font-bold">{t(locale, "leaderboard.summary")}</h3>
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
      ) : (
        <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
          {t(locale, "leaderboard.noMembers")}
        </div>
      )}
    </section>
  );
}

function gameModeLabel(mode: LeagueGameMode, locale: Locale) {
  return mode === "match_scores" ? t(locale, "app.matchScores") : t(locale, "app.stagePredictions");
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
