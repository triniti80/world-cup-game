import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { leagueMembers, leagues } from "@/db/schema";
import { readSession, setActiveLeagueId } from "@/lib/session";

const createSchema = z.object({
  action: z.literal("create"),
  name: z.string().min(2).max(80),
  gameMode: z.enum(["stage_predictions", "match_scores"]),
});

const joinSchema = z.object({
  action: z.literal("join"),
  inviteCode: z.string().min(1).max(32),
});

const activateSchema = z.object({
  action: z.literal("activate"),
  leagueId: z.number().int().positive(),
});

const bodySchema = z.discriminatedUnion("action", [createSchema, joinSchema, activateSchema]);

function makeInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

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
    return NextResponse.json({ error: "Invalid league request." }, { status: 400 });
  }

  if (parsed.data.action === "create") {
    const [league] = await db
      .insert(leagues)
      .values({
        name: parsed.data.name.trim(),
        inviteCode: makeInviteCode(),
        gameMode: parsed.data.gameMode,
        createdByUserId: session.userId,
      })
      .returning();
    if (!league) {
      return NextResponse.json({ error: "Could not create league." }, { status: 500 });
    }

    await db
      .insert(leagueMembers)
      .values({
        leagueId: league.id,
        userId: session.userId,
        displayName: session.name,
      })
      .onConflictDoNothing({ target: [leagueMembers.userId, leagueMembers.leagueId] });
    await setActiveLeagueId(league.id);

    return NextResponse.json({
      ok: true,
      league: {
        id: league.id,
        name: league.name,
        inviteCode: league.inviteCode,
        gameMode: league.gameMode,
      },
    });
  }

  if (parsed.data.action === "activate") {
    const [membership] = await db
      .select({ id: leagueMembers.id })
      .from(leagueMembers)
      .where(
        and(
          eq(leagueMembers.userId, session.userId),
          eq(leagueMembers.leagueId, parsed.data.leagueId),
        ),
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of that league." }, { status: 403 });
    }

    await setActiveLeagueId(parsed.data.leagueId);
    return NextResponse.json({ ok: true, leagueId: parsed.data.leagueId });
  }

  const inviteCode = parsed.data.inviteCode.trim().toUpperCase();
  const [league] = await db.select().from(leagues).where(eq(leagues.inviteCode, inviteCode)).limit(1);
  if (!league) {
    return NextResponse.json({ error: "Invite code was not found." }, { status: 404 });
  }

  const [existing] = await db
    .select({ id: leagueMembers.id })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.userId, session.userId), eq(leagueMembers.leagueId, league.id)))
    .limit(1);

  if (!existing) {
    await db.insert(leagueMembers).values({
      leagueId: league.id,
      userId: session.userId,
      displayName: session.name,
    });
  }
  await setActiveLeagueId(league.id);

  return NextResponse.json({
    ok: true,
    league: {
      id: league.id,
      name: league.name,
      inviteCode: league.inviteCode,
      gameMode: league.gameMode,
    },
  });
}
