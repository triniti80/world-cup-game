import {
  formatKickoff,
  getMatchLockAt,
  getMatchName,
  stageLabel,
  type Match,
} from "@/lib/world-cup/data";
import { t, type Locale } from "@/lib/i18n";
import { OutcomePoints } from "./OutcomePoints";
import { TeamBadge } from "./TeamBadge";

export function MatchCard({
  match,
  compact = false,
  locale = "en",
  showOutcomePoints = false,
}: {
  match: Match;
  compact?: boolean;
  locale?: Locale;
  showOutcomePoints?: boolean;
}) {
  const lockAt = getMatchLockAt(match);
  const hasActualScore = match.homeScore !== undefined && match.awayScore !== undefined;

  return (
    <article className="glass-card rounded-xl p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
            {t(locale, "common.match")} {match.number} · {stageLabel(match.stage, locale)}
            {match.group ? ` · ${t(locale, "common.group")} ${match.group}` : ""}
          </div>
          <h3 className="mt-1 font-display text-lg font-bold text-[var(--color-fg)]">
            {getMatchName(match, locale)}
          </h3>
        </div>
        <span className="rounded-full bg-[var(--color-panel-highest)] px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
          {t(locale, `status.${match.status}`)}
        </span>
      </div>

      {!compact && (
        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamBadge teamId={match.homeTeamId} label={match.homePlaceholder} locale={locale} />
          <div className="font-display text-2xl font-extrabold text-[var(--color-fg-muted)]">
            {hasActualScore ? `${match.homeScore}-${match.awayScore}` : t(locale, "common.vs").toUpperCase()}
          </div>
          <TeamBadge teamId={match.awayTeamId} label={match.awayPlaceholder} locale={locale} />
        </div>
      )}

      <div className="grid gap-2 text-sm text-[var(--color-fg-muted)]">
        {hasActualScore ? (
          <div className="flex justify-between gap-3">
            <span>{t(locale, "match.actualResult")}</span>
            <span className="text-end font-semibold text-[var(--color-accent)]">
              {match.homeScore}-{match.awayScore}
            </span>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <span>{t(locale, "match.kickoff")}</span>
          <span className="text-end font-semibold text-[var(--color-fg)]">
            {formatKickoff(match.kickoffAtUtc, locale)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span>{t(locale, "match.predictionLock")}</span>
          <span className="text-end font-semibold text-[var(--color-danger)]">
            {formatKickoff(lockAt.toISOString(), locale)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span>{t(locale, "match.venue")}</span>
          <span className="max-w-52 text-end">{match.venue}</span>
        </div>
      </div>

      {showOutcomePoints ? (
        <div className="mt-4 border-t border-white/10 pt-3">
          <OutcomePoints matchNumber={match.number} locale={locale} />
        </div>
      ) : null}
    </article>
  );
}
