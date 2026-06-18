"use client";

import { useMemo, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import {
  formatKickoff,
  getMatchName,
  getTeam,
  getTeamName,
  stageLabel,
} from "@/lib/world-cup/data";
import type {
  LeagueMatchPrediction,
  LeaguePredictionMatch,
  LeaguePredictionMember,
} from "@/lib/world-cup/repository";

const PAGE_SIZE = 12;
const FILTERS = ["all", "revealed", "hidden"] as const;
type Filter = (typeof FILTERS)[number];

export function LeaguePredictionsMatchList({
  locale,
  members,
  matches,
}: {
  locale: Locale;
  members: LeaguePredictionMember[];
  matches: LeaguePredictionMatch[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredMatches = useMemo(() => {
    if (filter === "revealed") return matches.filter((match) => match.revealed);
    if (filter === "hidden") return matches.filter((match) => !match.revealed);
    return matches;
  }, [filter, matches]);
  const visibleMatches = filteredMatches.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMatches.length;

  function changeFilter(nextFilter: Filter) {
    setFilter(nextFilter);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{t(locale, "leaguePredictions.matchScorePicks")}</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {t(locale, "leaguePredictions.beforeKickoff")}
          </p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-[var(--color-panel)] p-1 text-xs font-bold">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeFilter(option)}
              className={
                "rounded-lg px-3 py-2 transition " +
                (filter === option
                  ? "bg-[var(--color-accent)] text-[#102000]"
                  : "text-[var(--color-fg-muted)] hover:bg-[var(--color-panel-high)] hover:text-[var(--color-fg)]")
              }
            >
              {filterLabel(option, locale)}
            </button>
          ))}
        </div>
      </div>

      {visibleMatches.map((match) => (
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
                {match.homeScore !== undefined && match.awayScore !== undefined ? (
                  <span className="ms-2 font-bold text-[var(--color-accent)]">
                    · {t(locale, "match.actualResult")}: {match.homeScore}-{match.awayScore}
                  </span>
                ) : null}
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

      <div className="flex items-center justify-center">
        {hasMore ? (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            className="rounded-lg bg-[var(--color-panel-highest)] px-4 py-3 text-sm font-bold text-[var(--color-fg)] hover:bg-[var(--color-panel-high)]"
          >
            {locale === "he"
              ? `הצג עוד ${Math.min(PAGE_SIZE, filteredMatches.length - visibleCount)}`
              : `Show ${Math.min(PAGE_SIZE, filteredMatches.length - visibleCount)} more`}
          </button>
        ) : (
          <span className="text-sm text-[var(--color-fg-muted)]">
            {locale === "he"
              ? `${filteredMatches.length} משחקים מוצגים`
              : `${filteredMatches.length} matches shown`}
          </span>
        )}
      </div>
    </section>
  );
}

function filterLabel(filter: Filter, locale: Locale): string {
  if (filter === "all") return locale === "he" ? "הכול" : "All";
  if (filter === "revealed") return t(locale, "common.revealed");
  return t(locale, "common.hidden");
}

function formatRevealedScore(
  match: {
    homeTeamId?: string;
    awayTeamId?: string;
    homePlaceholder?: string;
    awayPlaceholder?: string;
  },
  prediction: LeagueMatchPrediction,
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
