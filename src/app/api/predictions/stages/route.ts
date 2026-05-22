import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { stagePredictions } from "@/db/schema";
import { readSession } from "@/lib/session";
import {
  ensureSeedTournament,
  getCurrentLeague,
  getDbTeamIdForSeedTeamSlug,
  getPreTournamentLockAt,
} from "@/lib/world-cup/repository";

const stageSchema = z.enum(["r32", "r16", "qf", "sf", "final", "champion"]);
const bodySchema = z.object({
  stage: stageSchema,
  teamIds: z.array(z.string().min(1)).max(48),
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
    return NextResponse.json({ error: "Invalid stage prediction." }, { status: 400 });
  }

  const league = await getCurrentLeague(session.userId);
  if (!league) {
    return NextResponse.json({ error: "Join a league before saving predictions." }, { status: 409 });
  }
  if (league.gameMode !== "stage_predictions") {
    return NextResponse.json(
      { error: "This league uses match score guessing, not stage predictions." },
      { status: 409 },
    );
  }

  const tournament = await ensureSeedTournament();
  const lockAt = getPreTournamentLockAt(tournament);
  if (Date.now() >= lockAt.getTime()) {
    return NextResponse.json(
      { error: "Pre-tournament stage picks are locked." },
      { status: 423 },
    );
  }

  const uniqueTeamSlugs = Array.from(new Set(parsed.data.teamIds));
  const teamIds = await Promise.all(
    uniqueTeamSlugs.map((slug) => getDbTeamIdForSeedTeamSlug(tournament.id, slug)),
  );
  if (teamIds.some((teamId) => teamId === null)) {
    return NextResponse.json({ error: "One or more selected teams were not found." }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(stagePredictions)
      .where(
        and(
          eq(stagePredictions.userId, session.userId),
          eq(stagePredictions.leagueId, league.leagueId),
          eq(stagePredictions.tournamentId, tournament.id),
          eq(stagePredictions.stage, parsed.data.stage),
        ),
      );

    if (teamIds.length > 0) {
      await tx.insert(stagePredictions).values(
        teamIds.map((teamId) => ({
          userId: session.userId,
          leagueId: league.leagueId,
          tournamentId: tournament.id,
          stage: parsed.data.stage,
          teamId: teamId!,
          source: "manual" as const,
        })),
      );
    }
  });

  return NextResponse.json({
    ok: true,
    stage: parsed.data.stage,
    teamIds: uniqueTeamSlugs,
  });
}
