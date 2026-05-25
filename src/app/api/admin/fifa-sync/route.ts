import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { syncFifaResults } from "@/lib/world-cup/fifa-sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const body = await safeJson(req);
  const dryRun = body?.dryRun === true;
  const summary = await syncFifaResults({ dryRun, actorUserId: session.userId });

  return NextResponse.json({ ok: true, summary });
}

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
