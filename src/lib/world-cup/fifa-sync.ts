import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { auditLog, matches } from "../../db/schema";
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
  Home?: { IdTeam?: unknown; Score?: unknown } | null;
  Away?: { IdTeam?: unknown; Score?: unknown } | null;
  Winner?: unknown;
};

export type FifaMatchResult = {
  matchNumber: number;
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
        status,
        homeScore,
        awayScore,
        winnerSide,
      },
    ];
  });
}

export async function fetchFifaCalendarMatches(fetchImpl: typeof fetch = fetch) {
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
}

export async function syncFifaResults(options: {
  dryRun?: boolean;
  actorUserId?: number | null;
} = {}): Promise<FifaSyncSummary> {
  const dryRun = options.dryRun ?? false;
  const fifaMatches = await fetchFifaCalendarMatches();
  const tournament = await ensureSeedTournament();
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

  for (const result of finalResults) {
    const [existing] = await db
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
      .where(
        and(
          eq(matches.tournamentId, tournament.id),
          eq(matches.matchNumber, result.matchNumber),
        ),
      )
      .limit(1);

    if (!existing) {
      summary.skipped.push(`Match ${result.matchNumber}: not found in local schedule.`);
      continue;
    }

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

    const winnerSide = winnerSideResult.side;
    const winnerTeamId =
      winnerSide === "home"
        ? existing.homeTeamId
        : winnerSide === "away"
          ? existing.awayTeamId
          : null;

    const nextResult = {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      status: "final" as const,
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

function toInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function toNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  return toInteger(value);
}

function isSameResult(
  existing: {
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    winnerTeamId: number | null;
    winnerSide: string | null;
  },
  nextResult: {
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    winnerTeamId: number | null;
    winnerSide: string | null;
  },
) {
  return (
    existing.homeScore === nextResult.homeScore &&
    existing.awayScore === nextResult.awayScore &&
    existing.status === nextResult.status &&
    existing.winnerTeamId === nextResult.winnerTeamId &&
    existing.winnerSide === nextResult.winnerSide
  );
}

function normalizeResultAudit(result: {
  matchNumber: number;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  winnerTeamId: number | null;
  winnerSide: string | null;
}) {
  return {
    matchNumber: result.matchNumber,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    status: result.status,
    winnerTeamId: result.winnerTeamId,
    winnerSide: result.winnerSide,
  };
}
