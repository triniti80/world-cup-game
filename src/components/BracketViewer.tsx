"use client";

import { useMemo, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import {
  getTeam,
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
  pickListByStage: Map<StagePredictionStage, BracketPick[]>;
  cache: Map<number, [BracketEntrant, BracketEntrant]>;
};

type BracketPlacement = {
  matchNumber: number;
  rowStart: number;
};

const leftRoundOf32 = [74, 77, 73, 75, 83, 84, 81, 82];
const leftRoundOf16 = [89, 90, 93, 94];
const leftQuarterFinals = [97, 98];
const rightQuarterFinals = [99, 100];
const rightRoundOf16 = [91, 92, 95, 96];
const rightRoundOf32 = [76, 78, 79, 80, 86, 88, 85, 87];
const rowStartsByRoundSize = {
  8: [1, 3, 5, 7, 9, 11, 13, 15],
  4: [2, 6, 10, 14],
  2: [4, 12],
} as const;
const leftRoundOf32Placements = toPlacements(leftRoundOf32, rowStartsByRoundSize[8]);
const leftRoundOf16Placements = toPlacements(leftRoundOf16, rowStartsByRoundSize[4]);
const leftQuarterFinalPlacements = toPlacements(leftQuarterFinals, rowStartsByRoundSize[2]);
const rightQuarterFinalPlacements = toPlacements(rightQuarterFinals, rowStartsByRoundSize[2]);
const rightRoundOf16Placements = toPlacements(rightRoundOf16, rowStartsByRoundSize[4]);
const rightRoundOf32Placements = toPlacements(rightRoundOf32, rowStartsByRoundSize[8]);
const officialPlaceholderByMatch: Partial<Record<number, Record<MatchSide, string>>> = {
  89: { home: "W74", away: "W77" },
  90: { home: "W73", away: "W75" },
  91: { home: "W76", away: "W78" },
  92: { home: "W79", away: "W80" },
  93: { home: "W83", away: "W84" },
  94: { home: "W81", away: "W82" },
  95: { home: "W86", away: "W88" },
  96: { home: "W85", away: "W87" },
  97: { home: "W89", away: "W90" },
  98: { home: "W93", away: "W94" },
  99: { home: "W91", away: "W92" },
  100: { home: "W95", away: "W96" },
  101: { home: "W97", away: "W98" },
  102: { home: "W99", away: "W100" },
  103: { home: "RU101", away: "RU102" },
  104: { home: "W101", away: "W102" },
};
const sourceMatchOrderByTargetStage = {
  r16: [...leftRoundOf32, ...rightRoundOf32],
  qf: [...leftRoundOf16, ...rightRoundOf16],
  sf: [...leftQuarterFinals, ...rightQuarterFinals],
  final: [101, 102],
  champion: [104],
} as const satisfies Partial<Record<StagePredictionStage, readonly number[]>>;

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
            ...buildUserPickMaps(stages, selectedUserId),
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

      <div className="-mx-4 px-2 pb-3 sm:px-4 lg:mx-0 lg:px-0">
        <div className="w-full">
          <BracketHeader locale={locale} />
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1.5 bg-[#071015] px-1.5 pb-4 pt-4 md:gap-2 md:px-2">
            <BracketColumn
              placements={leftRoundOf32Placements}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
            />
            <BracketColumn
              placements={leftRoundOf16Placements}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
            />
            <BracketColumn
              placements={leftQuarterFinalPlacements}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
            />
            <FinalColumn
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
            />
            <BracketColumn
              placements={rightQuarterFinalPlacements}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
            />
            <BracketColumn
              placements={rightRoundOf16Placements}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
            />
            <BracketColumn
              placements={rightRoundOf32Placements}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
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
    <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1.5 bg-[#16191c] px-1.5 md:gap-2 md:px-2">
      {columns.map((column, index) => (
        <div key={`${column.title}-${index}`} className="py-1.5 text-center">
          <div className="truncate font-display text-[10px] font-bold leading-3 text-[var(--color-fg)] sm:text-xs">
            {column.title}
          </div>
          <div className="truncate text-[9px] text-[var(--color-fg-muted)] sm:text-[10px]">{column.range}</div>
          <div className="-mx-1.5 mt-1 bg-white/5 py-0.5 text-[9px] text-[var(--color-fg-muted)] sm:text-[10px] md:-mx-2">
            {column.points}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketColumn({
  placements,
  matchByNumber,
  locale,
  userContext,
}: {
  placements: BracketPlacement[];
  matchByNumber: Map<number, SeededMatchWithResult>;
  locale: Locale;
  userContext: UserBracketContext | null;
}) {
  return (
    <div className={bracketColumnClassName}>
      {placements.map((placement) => {
        const match = matchByNumber.get(placement.matchNumber);
        return match ? (
          <div key={match.number} style={{ gridRowStart: placement.rowStart }}>
            <BracketCard
              match={match}
              matchByNumber={matchByNumber}
              locale={locale}
              userContext={userContext}
            />
          </div>
        ) : null;
      })}
    </div>
  );
}

const bracketColumnClassName =
  "grid grid-rows-[repeat(16,2.35rem)] gap-y-1 sm:grid-rows-[repeat(16,2.5rem)] md:grid-rows-[repeat(16,2.75rem)]";

function toPlacements(
  matchNumbers: readonly number[],
  rowStarts: readonly number[],
): BracketPlacement[] {
  return matchNumbers.map((matchNumber, index) => ({
    matchNumber,
    rowStart: rowStarts[index] ?? 1,
  }));
}

function PlacedBracketCard({
  match,
  rowStart,
  matchByNumber,
  locale,
  userContext,
  compact,
}: {
  match: SeededMatchWithResult;
  rowStart: number;
  matchByNumber: Map<number, SeededMatchWithResult>;
  locale: Locale;
  userContext: UserBracketContext | null;
  compact?: boolean;
}) {
  return (
    <div style={{ gridRowStart: rowStart }}>
      <BracketCard
        match={match}
        matchByNumber={matchByNumber}
        locale={locale}
        userContext={userContext}
        compact={compact}
      />
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
    <div className={bracketColumnClassName}>
      {semiLeft ? (
        <PlacedBracketCard
          match={semiLeft}
          rowStart={5}
          matchByNumber={matchByNumber}
          locale={locale}
          userContext={userContext}
        />
      ) : null}
      {final ? (
        <div
          className="rounded-lg border border-white/10 bg-cover bg-center p-1 shadow-xl shadow-black/20 [background-image:linear-gradient(rgba(7,16,21,0.45),rgba(7,16,21,0.75)),url('/favicon.svg')]"
          style={{ gridRowStart: 7, gridRowEnd: "span 2" }}
        >
          <div className="mb-0.5 text-center font-display text-[9px] font-bold leading-none text-[var(--color-fg)] sm:text-[10px]">
            {locale === "he" ? "גמר" : "Final"}
          </div>
          <BracketCard
            match={final}
            matchByNumber={matchByNumber}
            locale={locale}
            userContext={userContext}
            compact
          />
        </div>
      ) : null}
      {third ? (
        <PlacedBracketCard
          match={third}
          rowStart={10}
          matchByNumber={matchByNumber}
          locale={locale}
          userContext={userContext}
        />
      ) : null}
      {semiRight ? (
        <PlacedBracketCard
          match={semiRight}
          rowStart={12}
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

  return (
    <article
      className={[
        "relative h-full rounded-md border border-white/5 bg-[#1b1d20] p-1 text-[10px] shadow-lg shadow-black/20 sm:p-1.5 sm:text-xs",
        compact ? "min-h-0" : "min-h-0",
      ].join(" ")}
    >
      <div className="space-y-0.5">
        {entrants.map((entrant) => (
          <EntrantLine key={`${match.number}-${entrant.key}`} entrant={entrant} />
        ))}
      </div>
    </article>
  );
}

function EntrantLine({ entrant }: { entrant: BracketEntrant }) {
  return (
    <div
      className={[
        "flex min-h-4 items-center justify-between gap-1",
        entrantStateClass(entrant),
        entrant.picked ? "font-bold" : "",
      ].join(" ")}
    >
      <span className="min-w-0 whitespace-nowrap">
        {entrant.flag ? <span className="me-1 hidden sm:inline">{entrant.flag}</span> : null}
        <span className="font-bold leading-none">{entrant.code ?? entrant.label}</span>
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
  const placeholder = getMatchPlaceholder(match, side);
  const team = getTeam(teamId);
  if (team) return teamEntrant(team);
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

  const entrants = resolveUserBaseEntrantsForMatch(match, matchByNumber, locale, context);

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

function resolveUserBaseEntrantsForMatch(
  match: SeededMatchWithResult,
  matchByNumber: Map<number, SeededMatchWithResult>,
  locale: Locale,
  context: UserBracketContext,
): [BracketEntrant, BracketEntrant] {
  if (match.stage === "r32" || match.stage === "third") {
    return [
      resolveLiveSide(match, "home", matchByNumber, locale),
      resolveLiveSide(match, "away", matchByNumber, locale),
    ];
  }

  return [
    resolveUserSlot(getMatchPlaceholder(match, "home"), matchByNumber, locale, context),
    resolveUserSlot(getMatchPlaceholder(match, "away"), matchByNumber, locale, context),
  ];
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
      : resolveUserBaseEntrantsForMatch(sourceMatch, matchByNumber, locale, context);
  const pickedCandidate = candidates.find((candidate) => picks.has(candidate.key));
  if (!pickedCandidate) {
    return getOrderedFallbackPick(sourceMatch, targetStage, context);
  }

  const pick = picks.get(pickedCandidate.key);
  return pick ? pickEntrant(pick) : pickedCandidate;
}

function getOrderedFallbackPick(
  sourceMatch: SeededMatchWithResult,
  targetStage: StagePredictionStage,
  context: UserBracketContext,
): BracketEntrant | null {
  if (!isOrderedFallbackStage(targetStage)) return null;
  const sourceOrder: readonly number[] = sourceMatchOrderByTargetStage[targetStage];
  if (!sourceOrder) return null;
  const sourceIndex = sourceOrder.indexOf(sourceMatch.number);
  if (sourceIndex < 0) return null;
  const pick = context.pickListByStage.get(targetStage)?.[sourceIndex];
  return pick ? pickEntrant(pick) : null;
}

function buildUserPickMaps(
  stages: MobileLeaguePredictionStage[],
  userId: number,
): Pick<UserBracketContext, "pickByStage" | "pickListByStage"> {
  const pickByStage = new Map<StagePredictionStage, Map<string, BracketPick>>();
  const pickListByStage = new Map<StagePredictionStage, BracketPick[]>();
  for (const stage of stages) {
    const prediction = stage.predictions.find((candidate) => candidate.userId === userId);
    const picks = new Map<string, BracketPick>();
    const pickList: BracketPick[] = [];
    for (const pick of prediction?.picks ?? []) {
      const key = pickKey(pick);
      const bracketPick = { ...pick, key };
      picks.set(key, bracketPick);
      pickList.push(bracketPick);
    }
    pickByStage.set(stage.stage, picks);
    pickListByStage.set(stage.stage, pickList);
  }
  return { pickByStage, pickListByStage };
}

function pickEntrant(pick: BracketPick): BracketEntrant {
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
    ? { ...teamEntrant(team), state: stateFromSuccessful(pick.successful) }
    : {
        key: pick.key,
        label: pick.teamName,
        code: pick.teamCode,
        state: stateFromSuccessful(pick.successful),
      };
}

function teamEntrant(team: Team): BracketEntrant {
  return {
    key: `team:${team.id}`,
    label: team.code,
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

function getMatchPlaceholder(match: SeededMatchWithResult, side: MatchSide): string | undefined {
  return (
    officialPlaceholderByMatch[match.number]?.[side] ??
    (side === "home" ? match.homePlaceholder : match.awayPlaceholder)
  );
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

function isOrderedFallbackStage(
  stage: StagePredictionStage,
): stage is keyof typeof sourceMatchOrderByTargetStage {
  return stage in sourceMatchOrderByTargetStage;
}
