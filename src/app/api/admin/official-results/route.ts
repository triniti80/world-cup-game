import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { officialBonusResults, officialStageResults } from "@/db/schema";
import { readSession } from "@/lib/session";
import {
  ensureSeedTournament,
  getDbTeamIdForSeedTeamSlug,
} from "@/lib/world-cup/repository";
import { recalculateOfficialResultScoreEvents } from "@/lib/world-cup/scoring";

const stageSchema = z.object({
  kind: z.literal("stage"),
  stage: z.enum(["r32", "r16", "qf", "sf", "final", "champion"]),
  teamIds: z.array(z.string().min(1)).max(48),
});

const topScorerSchema = z.object({
  kind: z.literal("top_scorer"),
  playerName: z.string().min(2).max(120),
});

const tournamentWinnerSchema = z.object({
  kind: z.literal("tournament_winner"),
  teamId: z.string().min(1),
});

const bodySchema = z.discriminatedUnion("kind", [
  stageSchema,
  topScorerSchema,
  tournamentWinnerSchema,
]);

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid official result payload." }, { status: 400 });
  }

  const tournament = await ensureSeedTournament();
  const now = new Date();

  if (parsed.data.kind === "stage") {
    const stagePayload = parsed.data;
    const uniqueTeamSlugs = Array.from(new Set(stagePayload.teamIds));
    const teamIds = await Promise.all(
      uniqueTeamSlugs.map((slug) => getDbTeamIdForSeedTeamSlug(tournament.id, slug)),
    );
    if (teamIds.some((teamId) => teamId === null)) {
      return NextResponse.json(
        { error: "One or more official stage teams were not found." },
        { status: 404 },
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(officialStageResults)
        .where(
          and(
            eq(officialStageResults.tournamentId, tournament.id),
            eq(officialStageResults.stage, stagePayload.stage),
          ),
        );

      if (teamIds.length > 0) {
        await tx.insert(officialStageResults).values(
          teamIds.map((teamId) => ({
            tournamentId: tournament.id,
            stage: stagePayload.stage,
            teamId: teamId!,
            updatedAt: now,
          })),
        );
      }
    });
  }

  if (parsed.data.kind === "top_scorer") {
    await db
      .insert(officialBonusResults)
      .values({
        tournamentId: tournament.id,
        type: "top_scorer",
        playerName: parsed.data.playerName.trim(),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [officialBonusResults.tournamentId, officialBonusResults.type],
        set: {
          playerName: parsed.data.playerName.trim(),
          teamId: null,
          updatedAt: now,
        },
      });
  }

  if (parsed.data.kind === "tournament_winner") {
    const teamId = await getDbTeamIdForSeedTeamSlug(tournament.id, parsed.data.teamId);
    if (!teamId) {
      return NextResponse.json({ error: "Unknown tournament winner team." }, { status: 404 });
    }

    await db
      .insert(officialBonusResults)
      .values({
        tournamentId: tournament.id,
        type: "tournament_winner",
        teamId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [officialBonusResults.tournamentId, officialBonusResults.type],
        set: {
          playerName: null,
          teamId,
          updatedAt: now,
        },
      });
  }

  await recalculateOfficialResultScoreEvents(tournament.id);

  return NextResponse.json({ ok: true });
}
