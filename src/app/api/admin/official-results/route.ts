import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { auditLog, officialBonusResults, officialStageResults } from "@/db/schema";
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

    const beforeRows = await db
      .select({ teamId: officialStageResults.teamId })
      .from(officialStageResults)
      .where(
        and(
          eq(officialStageResults.tournamentId, tournament.id),
          eq(officialStageResults.stage, stagePayload.stage),
        ),
      );

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

      await tx.insert(auditLog).values({
        actorUserId: session.userId,
        action: "official_stage_result.update",
        entityType: "official_stage_result",
        entityId: `${tournament.id}:${stagePayload.stage}`,
        beforeJson: {
          stage: stagePayload.stage,
          teamIds: beforeRows.map((row) => row.teamId).sort((a, b) => a - b),
        },
        afterJson: {
          stage: stagePayload.stage,
          teamIds: teamIds.map((teamId) => teamId!).sort((a, b) => a - b),
        },
      });
    });
  }

  if (parsed.data.kind === "top_scorer") {
    const [before] = await getOfficialBonusResult(tournament.id, "top_scorer");
    const playerName = parsed.data.playerName.trim();
    await db.transaction(async (tx) => {
      await tx
        .insert(officialBonusResults)
        .values({
          tournamentId: tournament.id,
          type: "top_scorer",
          playerName,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [officialBonusResults.tournamentId, officialBonusResults.type],
          set: {
            playerName,
            teamId: null,
            updatedAt: now,
          },
        });

      await tx.insert(auditLog).values({
        actorUserId: session.userId,
        action: "official_bonus_result.update",
        entityType: "official_bonus_result",
        entityId: `${tournament.id}:top_scorer`,
        beforeJson: normalizeBonusAudit(before),
        afterJson: { type: "top_scorer", playerName, teamId: null },
      });
    });
  }

  if (parsed.data.kind === "tournament_winner") {
    const teamId = await getDbTeamIdForSeedTeamSlug(tournament.id, parsed.data.teamId);
    if (!teamId) {
      return NextResponse.json({ error: "Unknown tournament winner team." }, { status: 404 });
    }

    const [before] = await getOfficialBonusResult(tournament.id, "tournament_winner");
    await db.transaction(async (tx) => {
      await tx
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

      await tx.insert(auditLog).values({
        actorUserId: session.userId,
        action: "official_bonus_result.update",
        entityType: "official_bonus_result",
        entityId: `${tournament.id}:tournament_winner`,
        beforeJson: normalizeBonusAudit(before),
        afterJson: { type: "tournament_winner", playerName: null, teamId },
      });
    });
  }

  await recalculateOfficialResultScoreEvents(tournament.id);

  return NextResponse.json({ ok: true });
}

function getOfficialBonusResult(
  tournamentId: number,
  type: "top_scorer" | "tournament_winner",
) {
  return db
    .select({
      type: officialBonusResults.type,
      playerName: officialBonusResults.playerName,
      teamId: officialBonusResults.teamId,
    })
    .from(officialBonusResults)
    .where(
      and(
        eq(officialBonusResults.tournamentId, tournamentId),
        eq(officialBonusResults.type, type),
      ),
    )
    .limit(1);
}

function normalizeBonusAudit(
  bonus:
    | {
        type: "top_scorer" | "tournament_winner";
        playerName: string | null;
        teamId: number | null;
      }
    | undefined,
) {
  return bonus
    ? {
        type: bonus.type,
        playerName: bonus.playerName,
        teamId: bonus.teamId,
      }
    : null;
}
