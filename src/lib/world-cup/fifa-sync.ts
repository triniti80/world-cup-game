import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { auditLog, matches, teams } from "../../db/schema";
import { resolvePredictedWinnerSide, type PredictedWinnerSide } from "./match-predictions";
import { ensureSeedTournament } from "./repository";
import { recalculateTournamentMatchScoreEvents } from "./scoring";

export const FIFA_WORLD_CUP_2026_RESULTS_URL =
  "https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idCompetition=17&from=2026-06-01T00:00:00Z&to=2026-07-31T23:59:59Z";

type FifaCalendarResponse = {
  Results?: unknown[];
};

type FifaMatchObject = {
  MatchNumber?: unknown;
  MatchStatus?: unknown;
  HomeTeamScore?: unknown;
  AwayTeamScore?: unknown;
  Home?: FifaTeamObject | null;
  Away?: FifaTeamObject | null;
  Winner?: unknown;
};

type FifaTeamObject = {
  IdTeam?: unknown;
  IdCountry?: unknown;
  IdAssociation?: unknown;
  Score?: unknown;
  Abbreviation?: unknown;
};

export type FifaMatchResult = {
  matchNumber: number;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  status: "scheduled" | "live" | "final";
  homeScore: number | null;
  awayScore: number | null;
  winnerSide: PredictedWinnerSide | null;
};

export type FifaSyncSummary = {
  sourceUrl: string;
  fetched: number;
  finalResults: number;
  updated: number;
  unchanged: number;
  skipped: string[];
  dryRun: boolean;
};

export function parseFifaCalendarMatches(payload: unknown): FifaMatchResult[] {
  const response = payload as FifaCalendarResponse;
  const rows = Array.isArray(response.Results) ? response.Results : [];

  return rows.flatMap((row) => {
    const match = row as FifaMatchObject;
    const matchNumber = toInteger(match.MatchNumber);
    if (!matchNumber) return [];

    const homeScore = toNullableInteger(match.HomeTeamScore ?? match.Home?.Score);
    const awayScore = toNullableInteger(match.AwayTeamScore ?? match.Away?.Score);
    const status = normalizeFifaStatus(match.MatchStatus, homeScore, awayScore);
    const winnerSide = resolveFifaWinnerSide(match);

    return [
      {
        matchNumber,
        homeTeamCode: fifaTeamCode(match.Home),
        awayTeamCode: fifaTeamCode(match.Away),
        status,
        homeScore,
        awayScore,
        winnerSide,
      },
    ];
  });
}

export async function fetchFifaCalendarMatches(fetchImpl: typeof fetch = fetch) {
  const maxAttempts = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetchImpl(FIFA_WORLD_CUP_2026_RESULTS_URL, {
        headers: {
          accept: "application/json",
          "user-agent": "world-cup-game/1.0 (+https://www.fifa.com)",
        },
        next: { revalidate: 60 },
      });

      if (!res.ok) {
        throw new Error(`FIFA results fetch failed with ${res.status}`);
      }

      return parseFifaCalendarMatches(await res.json());
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await delay(500 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("FIFA results fetch failed");
}

export async function syncFifaResults(options: {
  dryRun?: boolean;
  actorUserId?: number | null;
} = {}): Promise<FifaSyncSummary> {
  const dryRun = options.dryRun ?? false;
  const fifaMatches = await fetchFifaCalendarMatches();
  const tournament = await ensureSeedTournament();
  const { localMatches, teamIdByFifaCode } = await getLocalMatchesForSync(tournament.id);
  const finalResults = fifaMatches.filter(
    (match) => match.status === "final" && match.homeScore !== null && match.awayScore !== null,
  );

  const summary: FifaSyncSummary = {
    sourceUrl: FIFA_WORLD_CUP_2026_RESULTS_URL,
    fetched: fifaMatches.length,
    finalResults: finalResults.length,
    updated: 0,
    unchanged: 0,
    skipped: [],
    dryRun,
  };

  for (const result of fifaMatches) {
    const existing = findLocalMatchForFifaResult(localMatches, result);

    if (!existing) {
      summary.skipped.push(
        `Match ${result.matchNumber}: ${result.homeTeamCode ?? "?"} vs ${result.awayTeamCode ?? "?"} not found in local schedule.`,
      );
      continue;
    }

    const hasScores = result.homeScore !== null && result.awayScore !== null;
    let winnerSide: PredictedWinnerSide | null = null;
    if (result.status === "final" && hasScores) {
      const winnerSideResult = resolvePredictedWinnerSide({
        stage: existing.stage,
        homeScore: result.homeScore!,
        awayScore: result.awayScore!,
        selectedSide: result.winnerSide,
      });
      if (!winnerSideResult.ok) {
        summary.skipped.push(
          `Match ${result.matchNumber}: tied knockout result has no FIFA winner side yet.`,
        );
        continue;
      }
      winnerSide = winnerSideResult.side;
    }

    const homeTeamId =
      existing.homeTeamId ??
      (result.homeTeamCode ? teamIdByFifaCode.get(result.homeTeamCode) ?? null : null);
    const awayTeamId =
      existing.awayTeamId ??
      (result.awayTeamCode ? teamIdByFifaCode.get(result.awayTeamCode) ?? null : null);
    const winnerTeamId =
      winnerSide === "home"
        ? homeTeamId
        : winnerSide === "away"
          ? awayTeamId
          : null;

    const nextResult = {
      homeTeamId,
      awayTeamId,
      homeScore: hasScores ? result.homeScore : null,
      awayScore: hasScores ? result.awayScore : null,
      status: result.status,
      winnerTeamId,
      winnerSide,
    };

    if (isSameResult(existing, nextResult)) {
      summary.unchanged += 1;
      continue;
    }

    if (!dryRun) {
      await db.transaction(async (tx) => {
        await tx
          .update(matches)
          .set({ ...nextResult, updatedAt: new Date() })
          .where(eq(matches.id, existing.id));

        await tx.insert(auditLog).values({
          actorUserId: options.actorUserId ?? null,
          action: "fifa_result.sync",
          entityType: "match",
          entityId: String(existing.id),
          beforeJson: normalizeResultAudit(existing),
          afterJson: normalizeResultAudit({ ...existing, ...nextResult }),
        });
      });

    }

    summary.updated += 1;
  }

  if (!dryRun) {
    await recalculateTournamentMatchScoreEvents(tournament.id);
  }

  return summary;
}

async function getLocalMatchesForSync(tournamentId: number) {
  const matchRows = await db
    .select({
      id: matches.id,
      stage: matches.stage,
      matchNumber: matches.matchNumber,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
      winnerTeamId: matches.winnerTeamId,
      winnerSide: matches.winnerSide,
    })
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId));

  const teamRows = await db
    .select({ id: teams.id, fifaCode: teams.fifaCode })
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId));
  const fifaCodeByTeamId = new Map(teamRows.map((team) => [team.id, team.fifaCode]));
  const teamIdByFifaCode = new Map(teamRows.map((team) => [team.fifaCode, team.id]));

  return {
    localMatches: matchRows.map((match) => ({
      ...match,
      homeTeamCode: match.homeTeamId ? fifaCodeByTeamId.get(match.homeTeamId) ?? null : null,
      awayTeamCode: match.awayTeamId ? fifaCodeByTeamId.get(match.awayTeamId) ?? null : null,
    })),
    teamIdByFifaCode,
  };
}

function findLocalMatchForFifaResult(
  localMatches: Awaited<ReturnType<typeof getLocalMatchesForSync>>["localMatches"],
  result: FifaMatchResult,
) {
  const homeCode = result.homeTeamCode;
  const awayCode = result.awayTeamCode;
  if (homeCode && awayCode) {
    const teamCodeMatch = localMatches.find(
      (match) => match.homeTeamCode === homeCode && match.awayTeamCode === awayCode,
    );
    if (teamCodeMatch) return teamCodeMatch;
  }

  return localMatches.find((match) => match.matchNumber === result.matchNumber);
}

function normalizeFifaStatus(
  rawStatus: unknown,
  homeScore: number | null,
  awayScore: number | null,
): FifaMatchResult["status"] {
  if (rawStatus === 0 && homeScore !== null && awayScore !== null) return "final";
  if (rawStatus === 1) return "scheduled";
  return homeScore !== null && awayScore !== null ? "live" : "scheduled";
}

function resolveFifaWinnerSide(match: FifaMatchObject): PredictedWinnerSide | null {
  const winnerId = typeof match.Winner === "string" ? match.Winner : null;
  const homeId = typeof match.Home?.IdTeam === "string" ? match.Home.IdTeam : null;
  const awayId = typeof match.Away?.IdTeam === "string" ? match.Away.IdTeam : null;

  if (winnerId && homeId && winnerId === homeId) return "home";
  if (winnerId && awayId && winnerId === awayId) return "away";
  return null;
}

function fifaTeamCode(team: FifaTeamObject | null | undefined): string | null {
  return normalizeCode(team?.Abbreviation ?? team?.IdCountry ?? team?.IdAssociation);
}

function normalizeCode(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : null;
}

function toInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function toNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  return toInteger(value);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSameResult(
  existing: {
    homeTeamId: number | null;
    awayTeamId: number | null;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    winnerTeamId: number | null;
    winnerSide: string | null;
  },
  nextResult: {
    homeTeamId: number | null;
    awayTeamId: number | null;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    winnerTeamId: number | null;
    winnerSide: string | null;
  },
) {
  return (
    existing.homeTeamId === nextResult.homeTeamId &&
    existing.awayTeamId === nextResult.awayTeamId &&
    existing.homeScore === nextResult.homeScore &&
    existing.awayScore === nextResult.awayScore &&
    existing.status === nextResult.status &&
    existing.winnerTeamId === nextResult.winnerTeamId &&
    existing.winnerSide === nextResult.winnerSide
  );
}

function normalizeResultAudit(result: {
  matchNumber: number;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  winnerTeamId: number | null;
  winnerSide: string | null;
}) {
  return {
    matchNumber: result.matchNumber,
    homeTeamId: result.homeTeamId ?? null,
    awayTeamId: result.awayTeamId ?? null,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    status: result.status,
    winnerTeamId: result.winnerTeamId,
    winnerSide: result.winnerSide,
  };
}
