import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { auditLog, users } from "@/db/schema";
import { readSession } from "@/lib/session";

const bodySchema = z.object({
  userId: z.number().int().positive(),
  isEnabled: z.boolean(),
  disabledReason: z.string().max(240).optional().nullable(),
});

export async function PATCH(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user access payload." }, { status: 400 });
  }

  if (parsed.data.userId === session.userId && !parsed.data.isEnabled) {
    return NextResponse.json({ error: "You cannot disable your own admin account." }, { status: 409 });
  }

  const [before] = await db.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
  if (!before) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const now = new Date();
  const [after] = await db
    .update(users)
    .set({
      isEnabled: parsed.data.isEnabled,
      disabledAt: parsed.data.isEnabled ? null : now,
      disabledReason: parsed.data.isEnabled
        ? null
        : parsed.data.disabledReason?.trim() || "Disabled by admin",
      updatedAt: now,
    })
    .where(eq(users.id, parsed.data.userId))
    .returning();

  await db.insert(auditLog).values({
    actorUserId: session.userId,
    action: parsed.data.isEnabled ? "user.enable" : "user.disable",
    entityType: "user",
    entityId: String(parsed.data.userId),
    beforeJson: normalizeUserAudit(before),
    afterJson: after ? normalizeUserAudit(after) : null,
  });

  return NextResponse.json({ ok: true });
}

function normalizeUserAudit(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isEnabled: user.isEnabled,
    disabledAt: user.disabledAt?.toISOString() ?? null,
    disabledReason: user.disabledReason,
  };
}
