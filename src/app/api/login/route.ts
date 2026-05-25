import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

const bodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(256),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  let user: typeof users.$inferSelect | undefined;
  try {
    [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  } catch (err) {
    console.error("Login failed", err);
    return NextResponse.json(
      { error: "Login failed because the database is unavailable." },
      { status: 503 },
    );
  }

  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  if (!user.isEnabled) {
    return NextResponse.json(
      {
        error: user.disabledReason
          ? `Your account is disabled: ${user.disabledReason}`
          : "Your account is disabled. Contact the pool admin.",
      },
      { status: 403 },
    );
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({ ok: true });
}
