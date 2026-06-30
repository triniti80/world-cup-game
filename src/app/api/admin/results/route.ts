import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { auditLog, matches } from "@/db/schema";
import { readSession } from "@/lib/session";
import {
  resolvePredictedWinnerSide,
  type PredictedWinnerSide,
} from "@/lib/world-cup/match-predictions";
import { recalculateMatchById, recalculateStageScoreEvents } from "@/lib/world-cup/scoring";

const bodySchema = z.object({
  matchDbId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  homePenaltyScore: z.number().int().min(0).max(99).optional().nullable(),
  awayPenaltyScore: z.number().int().min(0).max(99).optional().nullable(),
  winnerSide: z.enum(["home", "away"]).optional().nullable(),
  status: z.enum(["scheduled", "live", "final"]).default("final"),
});

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
    return NextResponse.json({ error: "Valid match scores are required." }, { status: 400 });
  }

  const [existing] = await db
    .select({
      id: matches.id,
      tournamentId: matches.tournamentId,
      stage: matches.stage,
      matchNumber: matches.matchNumber,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homePenaltyScore: matches.homePenaltyScore,
      awayPenaltyScore: matches.awayPenaltyScore,
      status: matches.status,
      winnerTeamId: matches.winnerTeamId,
      winnerSide: matches.winnerSide,
    })
    .from(matches)
    .where(eq(matches.id, parsed.data.matchDbId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const winnerSideResult = resolvePredictedWinnerSide({
    stage: existing.stage,
    homeScore: parsed.data.homeScore,
    awayScore: parsed.data.awayScore,
    selectedSide: parsed.data.winnerSide,
  });
  if (!winnerSideResult.ok) {
    return NextResponse.json(
      { error: "Choose who advanced for a tied knockout result." },
      { status: 400 },
    );
  }

  const hasHomePenaltyScore =
    parsed.data.homePenaltyScore !== null && parsed.data.homePenaltyScore !== undefined;
  const hasAwayPenaltyScore =
    parsed.data.awayPenaltyScore !== null && parsed.data.awayPenaltyScore !== undefined;
  if (hasHomePenaltyScore !== hasAwayPenaltyScore) {
    return NextResponse.json(
      { error: "Enter both penalty scores or leave both empty." },
      { status: 400 },
    );
  }

  const winnerSide: PredictedWinnerSide | null = winnerSideResult.side;
  const winnerTeamId =
    winnerSide === "home"
      ? existing.homeTeamId
      : winnerSide === "away"
        ? existing.awayTeamId
        : null;

  const nextResult = {
    homeScore: parsed.data.homeScore,
    awayScore: parsed.data.awayScore,
    homePenaltyScore: hasHomePenaltyScore ? parsed.data.homePenaltyScore! : null,
    awayPenaltyScore: hasAwayPenaltyScore ? parsed.data.awayPenaltyScore! : null,
    status: parsed.data.status,
    winnerTeamId,
    winnerSide,
  };

  const [updated] = await db.transaction(async (tx) => {
    const updatedRows = await tx
      .update(matches)
      .set({
        ...nextResult,
        updatedAt: new Date(),
      })
      .where(eq(matches.id, parsed.data.matchDbId))
      .returning({
        id: matches.id,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        homePenaltyScore: matches.homePenaltyScore,
        awayPenaltyScore: matches.awayPenaltyScore,
        winnerSide: matches.winnerSide,
        status: matches.status,
      });

    await tx.insert(auditLog).values({
      actorUserId: session.userId,
      action: "match_result.update",
      entityType: "match",
      entityId: String(parsed.data.matchDbId),
      beforeJson: normalizeResultAudit(existing),
      afterJson: normalizeResultAudit({ ...existing, ...nextResult }),
    });

    return updatedRows;
  });

  await recalculateMatchById(parsed.data.matchDbId);
  await recalculateStageScoreEvents(existing.tournamentId);

  return NextResponse.json({ ok: true, match: updated ?? null });
}

function normalizeResultAudit(result: {
  matchNumber: number;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  status: string;
  winnerTeamId: number | null;
  winnerSide: string | null;
}) {
  return {
    matchNumber: result.matchNumber,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    homePenaltyScore: result.homePenaltyScore,
    awayPenaltyScore: result.awayPenaltyScore,
    status: result.status,
    winnerTeamId: result.winnerTeamId,
    winnerSide: result.winnerSide,
  };
}
