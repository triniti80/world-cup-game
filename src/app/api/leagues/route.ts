import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { auditLog, leagueMembers, leagues } from "@/db/schema";
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

const renameSchema = z.object({
  action: z.literal("rename"),
  leagueId: z.number().int().positive(),
  name: z.string().min(2).max(80),
});

const deleteSchema = z.object({
  action: z.literal("delete"),
  leagueId: z.number().int().positive(),
});

const removeMemberSchema = z.object({
  action: z.literal("remove_member"),
  leagueId: z.number().int().positive(),
  membershipId: z.number().int().positive(),
});

const bodySchema = z.discriminatedUnion("action", [
  createSchema,
  joinSchema,
  activateSchema,
  renameSchema,
  deleteSchema,
  removeMemberSchema,
]);

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

  if (
    parsed.data.action === "rename" ||
    parsed.data.action === "delete" ||
    parsed.data.action === "remove_member"
  ) {
    const leagueId = parsed.data.leagueId;
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);

    if (!league) {
      return NextResponse.json({ error: "League not found." }, { status: 404 });
    }
    if (session.role !== "admin" && league.createdByUserId !== session.userId) {
      return NextResponse.json(
        { error: "Only the league creator or an admin can manage this league." },
        { status: 403 },
      );
    }

    if (parsed.data.action === "rename") {
      const [updated] = await db
        .update(leagues)
        .set({ name: parsed.data.name.trim() })
        .where(eq(leagues.id, leagueId))
        .returning();

      await db.insert(auditLog).values({
        actorUserId: session.userId,
        action: "league.rename",
        entityType: "league",
        entityId: String(leagueId),
        beforeJson: normalizeLeagueAudit(league),
        afterJson: updated ? normalizeLeagueAudit(updated) : null,
      });

      return NextResponse.json({ ok: true, league: updated });
    }

    if (parsed.data.action === "remove_member") {
      const [membership] = await db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.id, parsed.data.membershipId),
            eq(leagueMembers.leagueId, leagueId),
          ),
        )
        .limit(1);

      if (!membership) {
        return NextResponse.json({ error: "League member not found." }, { status: 404 });
      }
      if (membership.userId === session.userId) {
        return NextResponse.json(
          { error: "Use a leave-league flow to remove yourself." },
          { status: 409 },
        );
      }

      await db.transaction(async (tx) => {
        await tx.delete(leagueMembers).where(eq(leagueMembers.id, membership.id));
        await tx.insert(auditLog).values({
          actorUserId: session.userId,
          action: "league.member_remove",
          entityType: "league_member",
          entityId: String(membership.id),
          beforeJson: {
            league: normalizeLeagueAudit(league),
            membership: normalizeMembershipAudit(membership),
          },
          afterJson: null,
        });
      });

      return NextResponse.json({ ok: true });
    }

    await db.transaction(async (tx) => {
      await tx.delete(leagues).where(eq(leagues.id, leagueId));
      await tx.insert(auditLog).values({
        actorUserId: session.userId,
        action: "league.delete",
        entityType: "league",
        entityId: String(leagueId),
        beforeJson: normalizeLeagueAudit(league),
        afterJson: null,
      });
    });

    return NextResponse.json({ ok: true });
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

function normalizeMembershipAudit(membership: typeof leagueMembers.$inferSelect) {
  return {
    id: membership.id,
    leagueId: membership.leagueId,
    userId: membership.userId,
    displayName: membership.displayName,
    joinedAt: membership.joinedAt.toISOString(),
  };
}

function normalizeLeagueAudit(league: typeof leagues.$inferSelect) {
  return {
    id: league.id,
    name: league.name,
    inviteCode: league.inviteCode,
    gameMode: league.gameMode,
    createdByUserId: league.createdByUserId,
  };
}
