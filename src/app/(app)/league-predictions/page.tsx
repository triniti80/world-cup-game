import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import { readActiveLeagueId, readSession } from "@/lib/session";
import {
  formatKickoff,
  getMatchName,
  getTeam,
  getTeamName,
  stageLabel,
} from "@/lib/world-cup/data";
import { getLeaguePredictionVisibility } from "@/lib/world-cup/repository";

export default async function LeaguePredictionsPage() {
  const locale = await readLocale();
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const { league, members, matches, bonuses } = session
    ? await getLeaguePredictionVisibility(session.userId, activeLeagueId)
    : { league: null, members: [], matches: [], bonuses: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t(locale, "leaguePredictions.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          {t(locale, "leaguePredictions.body")}
        </p>
      </div>

      {!league ? (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold">{t(locale, "common.noActiveLeague")}</h2>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            {t(locale, "leaguePredictions.noLeagueBody")}
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
          <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">{t(locale, "common.activeLeague")}</div>
          <div className="mt-1 font-display text-lg font-bold">{league.leagueName}</div>
          <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {league.gameMode === "match_scores"
              ? t(locale, "app.matchScores")
              : t(locale, "app.stagePredictions")}
          </div>
        </section>
      )}

      {league ? (
        <>
          <section className="glass-card rounded-xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">{t(locale, "leaguePredictions.bonusPicks")}</h2>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  {t(locale, "leaguePredictions.bonusHidden")}
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-gold)]/15 px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
                {t(locale, "predictions.pointsEach")}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {members.map((member) => {
                const bonus = bonuses.find((row) => row.userId === member.userId);
                return (
                  <article
                    key={member.userId}
                    className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4"
                  >
                    <h3 className="font-display text-base font-bold">{member.name}</h3>
                    <div className="mt-3 grid gap-2 text-sm">
                      <VisibilityRow
                        label={locale === "he" ? "מלך השערים" : "Top scorer"}
                        submitted={Boolean(bonus?.topScorerSubmitted)}
                        revealed={Boolean(bonus?.topScorerRevealed)}
                        value={bonus?.topScorer}
                        missingLabel={t(locale, "common.missing")}
                        submittedLabel={t(locale, "common.submitted")}
                      />
                      {league.gameMode === "match_scores" ? (
                        <VisibilityRow
                          label={locale === "he" ? "אלופה" : "Champion"}
                          submitted={Boolean(bonus?.winnerSubmitted)}
                          revealed={Boolean(bonus?.winnerRevealed)}
                          value={getTeamName(getTeam(bonus?.winnerTeamId), locale)}
                          missingLabel={t(locale, "common.missing")}
                          submittedLabel={t(locale, "common.submitted")}
                        />
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {league.gameMode === "match_scores" ? (
            <section className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">{t(locale, "leaguePredictions.matchScorePicks")}</h2>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  {t(locale, "leaguePredictions.beforeKickoff")}
                </p>
              </div>
              {matches.map((match) => (
                <article key={match.dbId} className="glass-card rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                        {t(locale, "common.match")} {match.number} · {stageLabel(match.stage, locale)}
                        {match.group ? ` · ${t(locale, "common.group")} ${match.group}` : ""}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-bold">{getMatchName(match, locale)}</h3>
                      <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                        {formatKickoff(match.kickoffAtUtc, locale)}
                      </p>
                    </div>
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-bold " +
                        (match.revealed
                          ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                          : "bg-[var(--color-panel-highest)] text-[var(--color-fg-muted)]")
                      }
                    >
                      {match.revealed ? t(locale, "common.revealed") : t(locale, "common.hidden")}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {members.map((member) => {
                      const prediction = match.predictions.find((row) => row.userId === member.userId);
                      return (
                        <div
                          key={member.userId}
                          className="rounded-lg border border-white/10 bg-[var(--color-panel-low)] px-3 py-2"
                        >
                          <div className="text-sm font-bold">{member.name}</div>
                          <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
                            {!prediction?.submitted
                              ? t(locale, "common.missing")
                              : prediction.revealed
                                ? formatRevealedScore(match, prediction, locale)
                                : t(locale, "common.submitted")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="glass-card rounded-xl p-5">
              <h2 className="font-display text-xl font-bold">{t(locale, "leaguePredictions.stagePicks")}</h2>
              <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                {t(locale, "leaguePredictions.stageBody")}
              </p>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

function formatRevealedScore(
  match: {
    homeTeamId?: string;
    awayTeamId?: string;
    homePlaceholder?: string;
    awayPlaceholder?: string;
  },
  prediction: {
    homeScore?: number;
    awayScore?: number;
    predictedWinnerSide?: "home" | "away";
  },
  locale: Locale,
): string {
  const score = `${prediction.homeScore} - ${prediction.awayScore}`;
  if (!prediction.predictedWinnerSide) return score;
  const sideLabel =
    prediction.predictedWinnerSide === "home"
      ? getTeamName(getTeam(match.homeTeamId), locale) ?? match.homePlaceholder ?? "Home"
      : getTeamName(getTeam(match.awayTeamId), locale) ?? match.awayPlaceholder ?? "Away";
  return `${score}, ${t(locale, "leaguePredictions.advances", { team: sideLabel })}`;
}

function VisibilityRow({
  label,
  submitted,
  revealed,
  value,
  missingLabel,
  submittedLabel,
}: {
  label: string;
  submitted: boolean;
  revealed: boolean;
  value?: string;
  missingLabel: string;
  submittedLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-panel-highest)] px-3 py-2">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className="font-bold text-[var(--color-accent)]">
        {!submitted ? missingLabel : revealed ? value ?? submittedLabel : submittedLabel}
      </span>
    </div>
  );
}
