import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { matches } from "@/db/schema";
import { readSession } from "@/lib/session";
import { ensureSeedTournament, getDbTeamIdForSeedTeamSlug } from "@/lib/world-cup/repository";

const bodySchema = z.object({
  matchDbId: z.number().int().positive(),
  stage: z.enum(["group", "r32", "r16", "qf", "sf", "final"]),
  groupCode: z.string().max(2).optional().nullable(),
  homeTeamSlug: z.string().optional().nullable(),
  awayTeamSlug: z.string().optional().nullable(),
  homePlaceholder: z.string().max(120).optional().nullable(),
  awayPlaceholder: z.string().max(120).optional().nullable(),
  kickoffAtUtc: z.string().datetime(),
  venue: z.string().min(2).max(160),
  status: z.enum(["scheduled", "live", "final"]),
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
    return NextResponse.json({ error: "Invalid fixture payload." }, { status: 400 });
  }

  const tournament = await ensureSeedTournament();
  const homeTeamId = parsed.data.homeTeamSlug
    ? await getDbTeamIdForSeedTeamSlug(tournament.id, parsed.data.homeTeamSlug)
    : null;
  const awayTeamId = parsed.data.awayTeamSlug
    ? await getDbTeamIdForSeedTeamSlug(tournament.id, parsed.data.awayTeamSlug)
    : null;

  if (parsed.data.homeTeamSlug && !homeTeamId) {
    return NextResponse.json({ error: "Home team not found." }, { status: 404 });
  }
  if (parsed.data.awayTeamSlug && !awayTeamId) {
    return NextResponse.json({ error: "Away team not found." }, { status: 404 });
  }

  const [updated] = await db
    .update(matches)
    .set({
      stage: parsed.data.stage,
      groupCode: parsed.data.stage === "group" ? parsed.data.groupCode?.trim() || null : null,
      homeTeamId,
      awayTeamId,
      homePlaceholder: parsed.data.homePlaceholder?.trim() || null,
      awayPlaceholder: parsed.data.awayPlaceholder?.trim() || null,
      kickoffAt: new Date(parsed.data.kickoffAtUtc),
      venue: parsed.data.venue.trim(),
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, parsed.data.matchDbId))
    .returning({ id: matches.id });

  if (!updated) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, match: updated });
}
