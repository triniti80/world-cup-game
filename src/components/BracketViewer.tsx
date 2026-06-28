"use client";

import { useMemo, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import {
  formatKickoff,
  getTeam,
  getTeamName,
  type Stage,
  type Team,
} from "@/lib/world-cup/data";
import type {
  LeaguePredictionMember,
  MobileLeaguePredictionStage,
  MobileLeagueStagePick,
  SeededMatchWithResult,
} from "@/lib/world-cup/repository";

type BracketStage = "r32" | "r16" | "qf" | "sf" | "final";
type StagePredictionStage = MobileLeaguePredictionStage["stage"];
type MatchSide = "home" | "away";
type ViewMode = "live" | `user:${number}`;
type PickState = "success" | "failure" | "neutral";

type BracketEntrant = {
  key: string;
  label: string;
  code?: string;
  flag?: string;
  score?: number;
  state: PickState;
  picked?: boolean;
  placeholder?: boolean;
};

type BracketPick = MobileLeagueStagePick & {
  key: string;
};

type UserBracketContext = {
  userId: number;
  pickByStage: Map<StagePredictionStage, Map<string, BracketPick>>;
  cache: Map<number, [BracketEntrant, BracketEntrant]>;
};

const leftRoundOf32 = [74, 77, 73, 75, 83, 84, 81, 82];
const leftRoundOf16 = [89, 90, 93, 94];
const leftQuarterFinals = [97, 98];
const rightQuarterFinals = [99, 100];
const rightRoundOf16 = [91, 92, 95, 96];
const rightRoundOf32 = [76, 78, 79, 80, 86, 88, 85, 87];

const nextPredictionStageByMatchStage = {
  r32: "r16",
  r16: "qf",
  qf: "sf",
  sf: "final",
  final: "champion",
} as const satisfies Record<BracketStage, StagePredictionStage>;

const stageDateRange = {
  r32: "June 28 - July 3",
  r16: "July 4 - 7",
  qf: "July 9 - 11",
  finalRounds: "July 14 - 19",
};

export function BracketViewer({
  locale,
  matches,
  members,
  stages,
}: {
  locale: Locale;
  matches: SeededMatchWithResult[];
  members: LeaguePredictionMember[];
  stages: MobileLeaguePredictionStage[];
}) {
  const [mode, setMode] = useState<ViewMode>("live");
  const selectedUserId = mode.startsWith("user:") ? Number(mode.slice("user:".length)) : null;
  const matchByNumber = useMemo(
    () => new Map(matches.map((match) => [match.number, match] as const)),
    [matches],
  );
  const userContext = useMemo(
    () =>
      selectedUserId === null
        ? null
        : {
            userId: selectedUserId,
            pickByStage: buildPickByStage(stages, selectedUserId),
            cache: new Map<number, [BracketEntrant, BracketEntrant]>(),
          },
    [selectedUserId, stages],
  );
  const selectedMember = members.find((member) => member.userId === selectedUserId);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block min-w-64">
          <span className="mb-2 block text-xs font-bold uppercase text-[var(--color-fg-muted)]">
            {locale === "he" ? "תצוגת בראקט" : "Bracket view"}
          </span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as ViewMode)}
            className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 text-sm font-bold text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
          >
            <option value="live">{locale === "he" ? "תוצאות חיות" : "Live results"}</option>
            {members.map((member) => (
              <option key={member.userId} value={`user:${member.userId}`}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm text-[var(--color-fg-muted)]">
          {selectedMember
            ? locale === "he"
              ? `מציג את הבחירות של ${selectedMember.name}`
              : `Showing ${selectedMember.name}'s predictions`
            : locale === "he"
              ? "מציג תוצאות אמת"
              : "Showing live tournament results"}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-[var(--color-panel-low)] px-4 py-3 text-sm text-[var(--color-fg-muted)]">
          {locale === "he"
            ? "כדי לבחור משתתפים, עבור לליגת ניחושי שלבים פעילה."
            : "To choose participants, switch to an active stage-prediction league."}
        </div>
      ) : null}

      <div className="hide-scrollbar -mx-4 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0">
        <div className="min-w-[1280px]">
          <BracketHeader locale={locale} />
          <div className="grid grid-cols-[180px_180px_180px_220px_180px_180px_180px] gap-3 bg-[#071015] px-3 pb-8 pt-10">
            <BracketColumn
              matchNumbers={leftRoundOf32}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
              spacing="space-y-8"
            />
            <BracketColumn
              matchNumbers={leftRoundOf16}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
              spacing="space-y-[86px] pt-[58px]"
            />
            <BracketColumn
              matchNumbers={leftQuarterFinals}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
              spacing="space-y-[245px] pt-[174px]"
            />
            <FinalColumn
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
            />
            <BracketColumn
              matchNumbers={rightQuarterFinals}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
              spacing="space-y-[245px] pt-[174px]"
            />
            <BracketColumn
              matchNumbers={rightRoundOf16}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
              spacing="space-y-[86px] pt-[58px]"
            />
            <BracketColumn
              matchNumbers={rightRoundOf32}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
              spacing="space-y-8"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function BracketHeader({ locale }: { locale: Locale }) {
  const columns = [
    { title: t(locale, "stage.r32"), range: stageDateRange.r32, points: "25 pts" },
    { title: t(locale, "stage.r16"), range: stageDateRange.r16, points: "50 pts" },
    { title: t(locale, "stage.qf"), range: stageDateRange.qf, points: "100 pts" },
    {
      title: locale === "he" ? "שלבי הגמר" : "Final Rounds",
      range: stageDateRange.finalRounds,
      points: "200 - 400 pts",
    },
    { title: t(locale, "stage.qf"), range: stageDateRange.qf, points: "100 pts" },
    { title: t(locale, "stage.r16"), range: stageDateRange.r16, points: "50 pts" },
    { title: t(locale, "stage.r32"), range: stageDateRange.r32, points: "25 pts" },
  ];

  return (
    <div className="grid grid-cols-[180px_180px_180px_220px_180px_180px_180px] gap-3 bg-[#16191c] px-3">
      {columns.map((column, index) => (
        <div key={`${column.title}-${index}`} className="py-2 text-center">
          <div className="font-display text-sm font-bold leading-4 text-[var(--color-fg)]">
            {column.title}
          </div>
          <div className="text-xs text-[var(--color-fg-muted)]">{column.range}</div>
          <div className="-mx-3 mt-2 bg-white/5 py-1 text-xs text-[var(--color-fg-muted)]">
            {column.points}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketColumn({
  matchNumbers,
  matchByNumber,
  locale,
  userContext,
  spacing,
}: {
  matchNumbers: number[];
  matchByNumber: Map<number, SeededMatchWithResult>;
  locale: Locale;
  userContext: UserBracketContext | null;
  spacing: string;
}) {
  return (
    <div className={spacing}>
      {matchNumbers.map((matchNumber) => {
        const match = matchByNumber.get(matchNumber);
        return match ? (
          <BracketCard
            key={match.number}
            match={match}
            matchByNumber={matchByNumber}
            locale={locale}
            userContext={userContext}
          />
        ) : null;
      })}
    </div>
  );
}

function FinalColumn({
  matchByNumber,
  locale,
  userContext,
}: {
  matchByNumber: Map<number, SeededMatchWithResult>;
  locale: Locale;
  userContext: UserBracketContext | null;
}) {
  const semiLeft = matchByNumber.get(101);
  const final = matchByNumber.get(104);
  const third = matchByNumber.get(103);
  const semiRight = matchByNumber.get(102);

  return (
    <div className="space-y-8 pt-[118px]">
      {semiLeft ? (
        <BracketCard
          match={semiLeft}
          matchByNumber={matchByNumber}
          locale={locale}
          userContext={userContext}
        />
      ) : null}
      <div className="rounded-xl border border-white/10 bg-cover bg-center p-3 shadow-xl shadow-black/20 [background-image:linear-gradient(rgba(7,16,21,0.45),rgba(7,16,21,0.75)),url('/favicon.svg')]">
        <div className="mb-2 text-center font-display text-sm font-bold text-[var(--color-fg)]">
          {locale === "he" ? "גמר" : "Final"}
        </div>
        {final ? (
          <BracketCard
            match={final}
            matchByNumber={matchByNumber}
            locale={locale}
            userContext={userContext}
            compact
          />
        ) : null}
      </div>
      {third ? (
        <BracketCard
          match={third}
          matchByNumber={matchByNumber}
          locale={locale}
          userContext={userContext}
        />
      ) : null}
      {semiRight ? (
        <BracketCard
          match={semiRight}
          matchByNumber={matchByNumber}
          locale={locale}
          userContext={userContext}
        />
      ) : null}
    </div>
  );
}

function BracketCard({
  match,
  matchByNumber,
  locale,
  userContext,
  compact = false,
}: {
  match: SeededMatchWithResult;
  matchByNumber: Map<number, SeededMatchWithResult>;
  locale: Locale;
  userContext: UserBracketContext | null;
  compact?: boolean;
}) {
  const entrants = userContext
    ? resolveUserEntrantsForMatch(match, matchByNumber, locale, userContext)
    : resolveLiveEntrantsForMatch(match, matchByNumber, locale);
  const status = match.status === "final" ? "Final" : match.status === "live" ? "Live" : "Preview";

  return (
    <article
      className={[
        "relative rounded-lg border border-white/5 bg-[#1b1d20] p-3 text-sm shadow-lg shadow-black/20",
        compact ? "min-h-24" : "min-h-[86px]",
      ].join(" ")}
    >
      <div className="space-y-1.5">
        {entrants.map((entrant) => (
          <EntrantLine key={`${match.number}-${entrant.key}`} entrant={entrant} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span
          className={[
            "font-medium",
            match.status === "final" ? "text-[var(--color-accent)]" : "text-blue-400",
          ].join(" ")}
        >
          {status}
        </span>
        <span className="truncate text-[var(--color-fg-muted)]">
          {formatShortKickoff(match.kickoffAtUtc, locale)}
        </span>
      </div>
    </article>
  );
}

function EntrantLine({ entrant }: { entrant: BracketEntrant }) {
  return (
    <div
      className={[
        "flex min-h-5 items-center justify-between gap-2",
        entrantStateClass(entrant),
        entrant.picked ? "font-bold" : "",
      ].join(" ")}
    >
      <span className="min-w-0 truncate">
        {entrant.flag ? <span className="me-1.5">{entrant.flag}</span> : null}
        {entrant.code ? <span className="me-1 font-bold">{entrant.code}</span> : null}
        <span>{entrant.label}</span>
      </span>
      {entrant.score !== undefined ? <span className="font-display font-extrabold">{entrant.score}</span> : null}
    </div>
  );
}

function resolveLiveEntrantsForMatch(
  match: SeededMatchWithResult,
  matchByNumber: Map<number, SeededMatchWithResult>,
  locale: Locale,
): [BracketEntrant, BracketEntrant] {
  const winnerSide = getEffectiveWinnerSide(match);
  return [
    {
      ...resolveLiveSide(match, "home", matchByNumber, locale),
      score: match.homeScore,
      state: winnerSide === "home" ? "success" : "neutral",
      picked: winnerSide === "home",
    },
    {
      ...resolveLiveSide(match, "away", matchByNumber, locale),
      score: match.awayScore,
      state: winnerSide === "away" ? "success" : "neutral",
      picked: winnerSide === "away",
    },
  ];
}

function resolveLiveSide(
  match: SeededMatchWithResult,
  side: MatchSide,
  matchByNumber: Map<number, SeededMatchWithResult>,
  locale: Locale,
  seen = new Set<string>(),
): BracketEntrant {
  const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;
  const team = getTeam(teamId);
  if (team) return teamEntrant(team, locale);
  if (!placeholder) return placeholderEntrant(t(locale, "common.tbd"));

  const sourceMatch = getSourceMatch(matchByNumber, placeholder);
  const resolvedSide = sourceMatch ? getPlaceholderResolvedSide(placeholder, sourceMatch) : null;
  if (sourceMatch && resolvedSide && !seen.has(placeholder)) {
    seen.add(placeholder);
    return resolveLiveSide(sourceMatch, resolvedSide, matchByNumber, locale, seen);
  }

  return placeholderEntrant(placeholder);
}

function resolveUserEntrantsForMatch(
  match: SeededMatchWithResult,
  matchByNumber: Map<number, SeededMatchWithResult>,
  locale: Locale,
  context: UserBracketContext,
): [BracketEntrant, BracketEntrant] {
  const cached = context.cache.get(match.number);
  if (cached) return cached;

  const entrants: [BracketEntrant, BracketEntrant] =
    match.stage === "r32"
      ? [
          resolveLiveSide(match, "home", matchByNumber, locale),
          resolveLiveSide(match, "away", matchByNumber, locale),
        ]
      : match.stage === "third"
        ? [
            resolveLiveSide(match, "home", matchByNumber, locale),
            resolveLiveSide(match, "away", matchByNumber, locale),
          ]
        : [
            resolveUserSlot(match.homePlaceholder, matchByNumber, locale, context),
            resolveUserSlot(match.awayPlaceholder, matchByNumber, locale, context),
          ];

  const nextStage = isBracketStage(match.stage)
    ? nextPredictionStageByMatchStage[match.stage]
    : null;
  const selectedWinner = nextStage
    ? findPredictedWinnerForSource(match, nextStage, matchByNumber, locale, context)
    : null;
  const markedEntrants = entrants.map((entrant) => {
    if (!selectedWinner || entrant.key !== selectedWinner.key) return entrant;
    return { ...entrant, picked: true, state: selectedWinner.state };
  }) as [BracketEntrant, BracketEntrant];

  context.cache.set(match.number, markedEntrants);
  return markedEntrants;
}

function resolveUserSlot(
  placeholder: string | undefined,
  matchByNumber: Map<number, SeededMatchWithResult>,
  locale: Locale,
  context: UserBracketContext,
): BracketEntrant {
  if (!placeholder) return placeholderEntrant(t(locale, "common.tbd"));
  const sourceMatch = getSourceMatch(matchByNumber, placeholder);
  if (!sourceMatch || !placeholder.startsWith("W") || !isBracketStage(sourceMatch.stage)) {
    return placeholderEntrant(placeholder);
  }

  const targetStage = nextPredictionStageByMatchStage[sourceMatch.stage];
  return (
    findPredictedWinnerForSource(sourceMatch, targetStage, matchByNumber, locale, context) ??
    placeholderEntrant(placeholder)
  );
}

function findPredictedWinnerForSource(
  sourceMatch: SeededMatchWithResult,
  targetStage: StagePredictionStage,
  matchByNumber: Map<number, SeededMatchWithResult>,
  locale: Locale,
  context: UserBracketContext,
): BracketEntrant | null {
  const picks = context.pickByStage.get(targetStage);
  if (!picks) return null;

  const candidates =
    sourceMatch.stage === "r32"
      ? [
          resolveLiveSide(sourceMatch, "home", matchByNumber, locale),
          resolveLiveSide(sourceMatch, "away", matchByNumber, locale),
        ]
      : resolveUserEntrantsForMatch(sourceMatch, matchByNumber, locale, context);
  const pickedCandidate = candidates.find((candidate) => picks.has(candidate.key));
  if (!pickedCandidate) return null;

  const pick = picks.get(pickedCandidate.key);
  return pick ? pickEntrant(pick, locale) : pickedCandidate;
}

function buildPickByStage(
  stages: MobileLeaguePredictionStage[],
  userId: number,
): Map<StagePredictionStage, Map<string, BracketPick>> {
  const pickByStage = new Map<StagePredictionStage, Map<string, BracketPick>>();
  for (const stage of stages) {
    const prediction = stage.predictions.find((candidate) => candidate.userId === userId);
    const picks = new Map<string, BracketPick>();
    for (const pick of prediction?.picks ?? []) {
      const key = pickKey(pick);
      picks.set(key, { ...pick, key });
    }
    pickByStage.set(stage.stage, picks);
  }
  return pickByStage;
}

function pickEntrant(pick: BracketPick, locale: Locale): BracketEntrant {
  if (isPlaceholderKey(pick.teamId)) {
    return {
      key: pick.teamId,
      label: pick.teamName,
      code: pick.teamCode,
      state: stateFromSuccessful(pick.successful),
      placeholder: true,
    };
  }
  const team = getTeam(pick.teamId);
  return team
    ? { ...teamEntrant(team, locale), state: stateFromSuccessful(pick.successful) }
    : {
        key: pick.key,
        label: pick.teamName,
        code: pick.teamCode,
        state: stateFromSuccessful(pick.successful),
      };
}

function teamEntrant(team: Team, locale: Locale): BracketEntrant {
  return {
    key: `team:${team.id}`,
    label: getTeamName(team, locale) ?? team.name,
    code: team.code,
    flag: team.flag,
    state: "neutral",
  };
}

function placeholderEntrant(label: string): BracketEntrant {
  return {
    key: placeholderKey(label),
    label,
    code: label.startsWith("W") || label.startsWith("RU") ? undefined : normalizePlaceholderLabel(label),
    state: "neutral",
    placeholder: true,
  };
}

function getSourceMatch(
  matchByNumber: Map<number, SeededMatchWithResult>,
  placeholder: string,
): SeededMatchWithResult | undefined {
  const matchNumber = Number(placeholder.replace(/^RU|^W/, ""));
  if (!Number.isFinite(matchNumber)) return undefined;
  return matchByNumber.get(matchNumber);
}

function getPlaceholderResolvedSide(
  placeholder: string,
  sourceMatch: SeededMatchWithResult,
): MatchSide | null {
  const winnerSide = getEffectiveWinnerSide(sourceMatch);
  if (placeholder.startsWith("W")) return winnerSide;
  if (placeholder.startsWith("RU") && winnerSide) {
    return winnerSide === "home" ? "away" : "home";
  }
  return null;
}

function getEffectiveWinnerSide(match: SeededMatchWithResult): MatchSide | null {
  if (match.winnerSide) return match.winnerSide;
  if (match.homeScore === undefined || match.awayScore === undefined) return null;
  if (match.homeScore > match.awayScore) return "home";
  if (match.awayScore > match.homeScore) return "away";
  return null;
}

function pickKey(pick: MobileLeagueStagePick): string {
  return isPlaceholderKey(pick.teamId) ? pick.teamId : `team:${pick.teamId}`;
}

function placeholderKey(value: string): string {
  return `placeholder:${normalizePlaceholderLabel(value)}`;
}

function normalizePlaceholderLabel(value: string): string {
  return value.replaceAll("/", "");
}

function isPlaceholderKey(value: string): boolean {
  return value.startsWith("placeholder:");
}

function stateFromSuccessful(successful: boolean | null): PickState {
  if (successful === true) return "success";
  if (successful === false) return "failure";
  return "neutral";
}

function entrantStateClass(entrant: BracketEntrant): string {
  if (entrant.state === "success") return "text-[var(--color-accent)]";
  if (entrant.state === "failure") return "text-[var(--color-danger)]";
  if (entrant.placeholder) return "text-[var(--color-fg-muted)]";
  return "text-[var(--color-fg)]";
}

function isBracketStage(stage: Stage): stage is BracketStage {
  return stage === "r32" || stage === "r16" || stage === "qf" || stage === "sf" || stage === "final";
}

function formatShortKickoff(iso: string, locale: Locale): string {
  const formatted = formatKickoff(iso, locale);
  return formatted.replace(", 2026", "").replace(" GMT+1", "");
}
