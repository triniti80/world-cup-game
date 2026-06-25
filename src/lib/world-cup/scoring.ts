import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bonusPredictions,
  leagueMembers,
  leagues,
  matchPredictions,
  matches,
  officialBonusResults,
  officialStageResults,
  scoreEvents,
  stagePredictions,
} from "@/db/schema";
import { getCorrectOutcomePoints, getExactScorePoints, type OutcomeSide } from "./static-odds";

type FinalMatch = {
  id: number;
  matchNumber: number;
  tournamentId: number;
  status: "scheduled" | "live" | "final";
  homeScore: number | null;
  awayScore: number | null;
};

export const STAGE_POINTS = {
  r32: 10,
  r16: 20,
  qf: 40,
  sf: 80,
  final: 120,
  champion: 150,
} as const;

export const STAGE_REASON = {
  r32: "Round of 32 qualifier",
  r16: "Round of 16 qualifier",
  qf: "Quarter-finalist",
  sf: "Semi-finalist",
  final: "Finalist",
  champion: "World Cup champion",
} as const;

function outcome(homeScore: number, awayScore: number): OutcomeSide {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function scoreMatchPrediction(input: {
  matchNumber?: number;
  realHomeScore: number;
  realAwayScore: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
}): { points: number; reason: string } {
  const realOutcome = outcome(input.realHomeScore, input.realAwayScore);
  const predictedOutcome = outcome(input.predictedHomeScore, input.predictedAwayScore);

  if (realOutcome !== predictedOutcome) {
    return { points: 0, reason: "Wrong outcome" };
  }

  const outcomePoints = getCorrectOutcomePoints(input.matchNumber, realOutcome);

  if (
    input.realHomeScore === input.predictedHomeScore &&
    input.realAwayScore === input.predictedAwayScore
  ) {
    return {
      points: getExactScorePoints(input.matchNumber, realOutcome),
      reason: "Exact score",
    };
  }

  return { points: outcomePoints, reason: "Correct outcome" };
}

export async function recalculateMatchScoreEvents(match: FinalMatch): Promise<void> {
  const predictions = await db
    .select({
      id: matchPredictions.id,
      userId: matchPredictions.userId,
      leagueId: matchPredictions.leagueId,
      homeScore: matchPredictions.homeScore,
      awayScore: matchPredictions.awayScore,
      gameMode: leagues.gameMode,
    })
    .from(matchPredictions)
    .innerJoin(leagues, eq(matchPredictions.leagueId, leagues.id))
    .innerJoin(leagueMembers, and(
      eq(leagueMembers.leagueId, matchPredictions.leagueId),
      eq(leagueMembers.userId, matchPredictions.userId),
    ))
    .where(and(eq(matchPredictions.matchId, match.id), eq(leagues.gameMode, "match_scores")));

  const predictionIds = predictions.map((prediction) => prediction.id);
  const shouldScore =
    match.status === "final" && match.homeScore !== null && match.awayScore !== null;

  await db.transaction(async (tx) => {
    if (predictionIds.length > 0) {
      await tx
        .delete(scoreEvents)
        .where(
          and(
            eq(scoreEvents.sourceType, "match_prediction"),
            inArray(scoreEvents.sourceId, predictionIds),
          ),
        );
    }

    if (!shouldScore) return;

    const events = predictions.flatMap((prediction) => {
      const result = scoreMatchPrediction({
        matchNumber: match.matchNumber,
        realHomeScore: match.homeScore!,
        realAwayScore: match.awayScore!,
        predictedHomeScore: prediction.homeScore,
        predictedAwayScore: prediction.awayScore,
      });

      if (result.points === 0) return [];
      return [
        {
          userId: prediction.userId,
          leagueId: prediction.leagueId,
          tournamentId: match.tournamentId,
          gameMode: prediction.gameMode,
          sourceType: "match_prediction" as const,
          sourceId: prediction.id,
          points: result.points,
          reason: result.reason,
        },
      ];
    });

    if (events.length > 0) {
      await tx.insert(scoreEvents).values(events);
    }
  });
}

export async function recalculateMatchById(matchId: number): Promise<void> {
  const [match] = await db
    .select({
      id: matches.id,
      tournamentId: matches.tournamentId,
      matchNumber: matches.matchNumber,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (match) {
    await recalculateMatchScoreEvents(match);
  }
}

export async function recalculateTournamentMatchScoreEvents(tournamentId: number): Promise<void> {
  const matchRows = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId));

  for (const match of matchRows) {
    await recalculateMatchById(match.id);
  }
}

export async function recalculateStageScoreEvents(tournamentId: number): Promise<void> {
  const officialRows = await db
    .select({
      stage: officialStageResults.stage,
      teamId: officialStageResults.teamId,
    })
    .from(officialStageResults)
    .where(eq(officialStageResults.tournamentId, tournamentId));

  const roundOf32FixtureRows = await db
    .select({
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
    })
    .from(matches)
    .where(and(eq(matches.tournamentId, tournamentId), eq(matches.stage, "r32")));

  const roundOf32FixtureTeams = roundOf32FixtureRows.flatMap((row) =>
    [row.homeTeamId, row.awayTeamId].filter((teamId): teamId is number => teamId !== null),
  );

  const officialTeamByStage = [
    ...officialRows,
    ...roundOf32FixtureTeams.map((teamId) => ({ stage: "r32" as const, teamId })),
  ].reduce<Map<string, Set<number>>>((acc, row) => {
    const teamsForStage = acc.get(row.stage) ?? new Set<number>();
    teamsForStage.add(row.teamId);
    acc.set(row.stage, teamsForStage);
    return acc;
  }, new Map());

  const predictions = await db
    .select({
      id: stagePredictions.id,
      userId: stagePredictions.userId,
      leagueId: stagePredictions.leagueId,
      tournamentId: stagePredictions.tournamentId,
      stage: stagePredictions.stage,
      teamId: stagePredictions.teamId,
      gameMode: leagues.gameMode,
    })
    .from(stagePredictions)
    .innerJoin(leagues, eq(stagePredictions.leagueId, leagues.id))
    .innerJoin(
      leagueMembers,
      and(
        eq(leagueMembers.leagueId, stagePredictions.leagueId),
        eq(leagueMembers.userId, stagePredictions.userId),
      ),
    )
    .where(and(eq(stagePredictions.tournamentId, tournamentId), eq(leagues.gameMode, "stage_predictions")));

  const predictionIds = predictions.map((prediction) => prediction.id);

  await db.transaction(async (tx) => {
    if (predictionIds.length > 0) {
      await tx
        .delete(scoreEvents)
        .where(
          and(
            eq(scoreEvents.sourceType, "stage_prediction"),
            inArray(scoreEvents.sourceId, predictionIds),
          ),
        );
    }

    const events = predictions.flatMap((prediction) => {
      const officialTeams = officialTeamByStage.get(prediction.stage);
      if (!officialTeams?.has(prediction.teamId)) return [];
      return [
        {
          userId: prediction.userId,
          leagueId: prediction.leagueId,
          tournamentId: prediction.tournamentId,
          gameMode: prediction.gameMode,
          sourceType: "stage_prediction" as const,
          sourceId: prediction.id,
          points: STAGE_POINTS[prediction.stage],
          reason: STAGE_REASON[prediction.stage],
        },
      ];
    });

    if (events.length > 0) {
      await tx.insert(scoreEvents).values(events);
    }
  });
}

export async function recalculateBonusScoreEvents(tournamentId: number): Promise<void> {
  const officialRows = await db
    .select()
    .from(officialBonusResults)
    .where(eq(officialBonusResults.tournamentId, tournamentId));

  const officialTopScorer = officialRows.find((row) => row.type === "top_scorer")?.playerName;
  const officialWinnerTeamId = officialRows.find((row) => row.type === "tournament_winner")?.teamId;

  const predictions = await db
    .select({
      id: bonusPredictions.id,
      userId: bonusPredictions.userId,
      leagueId: bonusPredictions.leagueId,
      tournamentId: bonusPredictions.tournamentId,
      type: bonusPredictions.type,
      playerName: bonusPredictions.playerName,
      teamId: bonusPredictions.teamId,
      gameMode: leagues.gameMode,
    })
    .from(bonusPredictions)
    .innerJoin(leagues, eq(bonusPredictions.leagueId, leagues.id))
    .innerJoin(
      leagueMembers,
      and(
        eq(leagueMembers.leagueId, bonusPredictions.leagueId),
        eq(leagueMembers.userId, bonusPredictions.userId),
      ),
    )
    .where(eq(bonusPredictions.tournamentId, tournamentId));

  const predictionIds = predictions.map((prediction) => prediction.id);
  const normalizedTopScorer = officialTopScorer ? normalizeName(officialTopScorer) : null;

  await db.transaction(async (tx) => {
    if (predictionIds.length > 0) {
      await tx
        .delete(scoreEvents)
        .where(
          and(
            eq(scoreEvents.sourceType, "bonus_prediction"),
            inArray(scoreEvents.sourceId, predictionIds),
          ),
        );
    }

    const events = predictions.flatMap((prediction) => {
      const isTopScorerHit =
        prediction.type === "top_scorer" &&
        Boolean(normalizedTopScorer) &&
        normalizeName(prediction.playerName ?? "") === normalizedTopScorer;
      const isWinnerHit =
        prediction.type === "tournament_winner" &&
        prediction.gameMode === "match_scores" &&
        Boolean(officialWinnerTeamId) &&
        prediction.teamId === officialWinnerTeamId;

      if (!isTopScorerHit && !isWinnerHit) return [];
      return [
        {
          userId: prediction.userId,
          leagueId: prediction.leagueId,
          tournamentId: prediction.tournamentId,
          gameMode: prediction.gameMode,
          sourceType: "bonus_prediction" as const,
          sourceId: prediction.id,
          points: 100,
          reason: isTopScorerHit ? "Top scorer bonus" : "World Cup winner bonus",
        },
      ];
    });

    if (events.length > 0) {
      await tx.insert(scoreEvents).values(events);
    }
  });
}

export async function recalculateOfficialResultScoreEvents(tournamentId: number): Promise<void> {
  await recalculateStageScoreEvents(tournamentId);
  await recalculateBonusScoreEvents(tournamentId);
}
