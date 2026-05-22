import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { matchPredictions } from "@/db/schema";
import { readActiveLeagueId, readSession } from "@/lib/session";
import {
  getDbMatchForSeedMatch,
  getMatchLockAtUtc,
  getCurrentLeague,
  getSeedMatchById,
} from "@/lib/world-cup/repository";

const bodySchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
});

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Match id and valid non-negative scores are required." },
      { status: 400 },
    );
  }

  const seedMatch = getSeedMatchById(parsed.data.matchId);
  if (!seedMatch) {
    return NextResponse.json({ error: "Unknown match." }, { status: 404 });
  }

  const activeLeagueId = await readActiveLeagueId();
  const league = await getCurrentLeague(session.userId, activeLeagueId);
  if (!league) {
    return NextResponse.json({ error: "Join a league before saving predictions." }, { status: 409 });
  }
  if (league.gameMode !== "match_scores") {
    return NextResponse.json(
      { error: "This league uses pre-tournament stage predictions, not score guessing." },
      { status: 409 },
    );
  }

  const match = await getDbMatchForSeedMatch(seedMatch);
  if (!match) {
    return NextResponse.json({ error: "Match is not available yet." }, { status: 404 });
  }

  const lockAt = getMatchLockAtUtc(match);
  if (Date.now() >= lockAt.getTime()) {
    return NextResponse.json(
      { error: "This match is locked and can no longer be edited." },
      { status: 423 },
    );
  }

  const predictedWinnerTeamId =
    parsed.data.homeScore > parsed.data.awayScore
      ? match.homeTeamId
      : parsed.data.awayScore > parsed.data.homeScore
        ? match.awayTeamId
        : null;
  const now = new Date();

  const [prediction] = await db
    .insert(matchPredictions)
    .values({
      userId: session.userId,
      leagueId: league.leagueId,
      matchId: match.id,
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      predictedWinnerTeamId,
      lockedAt: lockAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        matchPredictions.userId,
        matchPredictions.leagueId,
        matchPredictions.matchId,
      ],
      set: {
        homeScore: parsed.data.homeScore,
        awayScore: parsed.data.awayScore,
        predictedWinnerTeamId,
        lockedAt: lockAt,
        updatedAt: now,
      },
    })
    .returning();

  return NextResponse.json({
    ok: true,
    prediction: prediction
      ? {
          matchId: seedMatch.id,
          homeScore: prediction.homeScore,
          awayScore: prediction.awayScore,
          updatedAt: prediction.updatedAt.toISOString(),
        }
      : null,
  });
}
