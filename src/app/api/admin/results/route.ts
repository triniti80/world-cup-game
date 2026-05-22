import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { matches } from "@/db/schema";
import { readSession } from "@/lib/session";
import { recalculateMatchById } from "@/lib/world-cup/scoring";

const bodySchema = z.object({
  matchDbId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
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
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
    })
    .from(matches)
    .where(eq(matches.id, parsed.data.matchDbId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const winnerTeamId =
    parsed.data.homeScore > parsed.data.awayScore
      ? existing.homeTeamId
      : parsed.data.awayScore > parsed.data.homeScore
        ? existing.awayTeamId
        : null;

  const [updated] = await db
    .update(matches)
    .set({
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      status: parsed.data.status,
      winnerTeamId,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, parsed.data.matchDbId))
    .returning({
      id: matches.id,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
    });

  if (parsed.data.status === "final") {
    await recalculateMatchById(parsed.data.matchDbId);
  }

  return NextResponse.json({ ok: true, match: updated ?? null });
}
