import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  leagueMembers,
  leagues,
  matchPredictions,
  matches,
  scoreEvents,
} from "@/db/schema";

type FinalMatch = {
  id: number;
  tournamentId: number;
  homeScore: number | null;
  awayScore: number | null;
};

function outcome(homeScore: number, awayScore: number): "home" | "away" | "draw" {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

export function scoreMatchPrediction(input: {
  realHomeScore: number;
  realAwayScore: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
}): { points: number; reason: string } {
  if (
    input.realHomeScore === input.predictedHomeScore &&
    input.realAwayScore === input.predictedAwayScore
  ) {
    return { points: 5, reason: "Exact score" };
  }

  const realOutcome = outcome(input.realHomeScore, input.realAwayScore);
  const predictedOutcome = outcome(input.predictedHomeScore, input.predictedAwayScore);
  if (realOutcome === predictedOutcome) {
    return { points: 2, reason: "Correct outcome" };
  }

  return { points: 0, reason: "Wrong outcome" };
}

export async function recalculateMatchScoreEvents(match: FinalMatch): Promise<void> {
  if (match.homeScore === null || match.awayScore === null) return;

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

    const events = predictions.flatMap((prediction) => {
      const result = scoreMatchPrediction({
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
