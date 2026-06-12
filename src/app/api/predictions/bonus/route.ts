import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { bonusPredictions } from "@/db/schema";
import { readActiveLeagueId, readSession } from "@/lib/session";
import {
  ensureSeedTournament,
  getBonusPredictionLockAt,
  getCurrentLeague,
  getDbTeamIdForSeedTeamSlug,
} from "@/lib/world-cup/repository";

const topScorerSchema = z.object({
  type: z.literal("top_scorer"),
  playerName: z.string().min(2).max(120),
});

const tournamentWinnerSchema = z.object({
  type: z.literal("tournament_winner"),
  teamId: z.string().min(1),
});

const bodySchema = z.discriminatedUnion("type", [topScorerSchema, tournamentWinnerSchema]);

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
    return NextResponse.json({ error: "Invalid bonus prediction." }, { status: 400 });
  }

  const activeLeagueId = await readActiveLeagueId();
  const league = await getCurrentLeague(session.userId, activeLeagueId);
  if (!league) {
    return NextResponse.json({ error: "Join a league before saving predictions." }, { status: 409 });
  }

  if (parsed.data.type === "tournament_winner" && league.gameMode !== "match_scores") {
    return NextResponse.json(
      { error: "World Cup winner bonus picks are only available in score guessing leagues." },
      { status: 409 },
    );
  }

  const tournament = await ensureSeedTournament();
  const lockAt = getBonusPredictionLockAt(tournament, parsed.data.type);
  if (Date.now() >= lockAt.getTime()) {
    return NextResponse.json(
      {
        error:
          parsed.data.type === "top_scorer"
            ? "Top scorer picks are locked."
            : "Pre-tournament bonus picks are locked.",
      },
      { status: 423 },
    );
  }

  const teamId =
    parsed.data.type === "tournament_winner"
      ? await getDbTeamIdForSeedTeamSlug(tournament.id, parsed.data.teamId)
      : null;
  if (parsed.data.type === "tournament_winner" && !teamId) {
    return NextResponse.json({ error: "Unknown team." }, { status: 404 });
  }

  const now = new Date();
  const [prediction] = await db
    .insert(bonusPredictions)
    .values({
      userId: session.userId,
      leagueId: league.leagueId,
      tournamentId: tournament.id,
      type: parsed.data.type,
      playerName: parsed.data.type === "top_scorer" ? parsed.data.playerName.trim() : null,
      teamId,
      lockedAt: lockAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        bonusPredictions.userId,
        bonusPredictions.leagueId,
        bonusPredictions.tournamentId,
        bonusPredictions.type,
      ],
      set: {
        playerName: parsed.data.type === "top_scorer" ? parsed.data.playerName.trim() : null,
        teamId,
        lockedAt: lockAt,
        updatedAt: now,
      },
    })
    .returning();

  return NextResponse.json({
    ok: true,
    prediction: prediction
      ? {
          type: prediction.type,
          playerName: prediction.playerName,
          teamId: parsed.data.type === "tournament_winner" ? parsed.data.teamId : null,
          updatedAt: prediction.updatedAt.toISOString(),
        }
      : null,
  });
}
