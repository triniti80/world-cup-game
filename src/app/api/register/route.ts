import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { leagueMembers, leagues, users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(320),
  password: z.string().min(8).max(256),
  inviteCode: z.string().max(32).optional().or(z.literal("")),
});

function makeInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Name, valid email, and password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  const name = parsed.data.name.trim();
  const email = parsed.data.email.trim().toLowerCase();
  const inviteCode = parsed.data.inviteCode?.trim().toUpperCase();

  try {
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (existing) {
        throw new Error("EMAIL_EXISTS");
      }

      const [countRow] = await tx.select({ count: sql<number>`count(*)::int` }).from(users);
      const count = countRow?.count ?? 0;
      const role = count === 0 ? "admin" : "user";

      const [createdUser] = await tx
        .insert(users)
        .values({
          name,
          email,
          passwordHash: await hashPassword(parsed.data.password),
          role,
        })
        .returning();
      if (!createdUser) throw new Error("USER_CREATE_FAILED");

      let league = inviteCode
        ? (
            await tx.select().from(leagues).where(eq(leagues.inviteCode, inviteCode)).limit(1)
          )[0]
        : (await tx.select().from(leagues).orderBy(leagues.id).limit(1))[0];

      if (!league) {
        if (inviteCode) throw new Error("INVITE_NOT_FOUND");
        const [createdLeague] = await tx
          .insert(leagues)
          .values({
            name: "WC2026 Friends Pool",
            inviteCode: makeInviteCode(),
            createdByUserId: createdUser.id,
          })
          .returning();
        league = createdLeague;
      }
      if (!league) throw new Error("LEAGUE_CREATE_FAILED");

      await tx.insert(leagueMembers).values({
        leagueId: league.id,
        userId: createdUser.id,
        displayName: name,
      });

      return createdUser;
    });

    await createSession({
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.role,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "An account already exists for that email." }, { status: 409 });
    }
    if (err instanceof Error && err.message === "INVITE_NOT_FOUND") {
      return NextResponse.json({ error: "Invite code was not found." }, { status: 404 });
    }
    console.error("Registration failed", err);
    return NextResponse.json(
      { error: "Registration failed because the database is unavailable." },
      { status: 503 },
    );
  }
}
