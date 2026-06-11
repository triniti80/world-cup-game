import { NextResponse } from "next/server";
import { readActiveLeagueId, readSession } from "@/lib/session";
import { getMobileLeaguePredictionVisibility } from "@/lib/world-cup/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const activeLeagueId = await readActiveLeagueId();
  const visibility = await getMobileLeaguePredictionVisibility(session.userId, activeLeagueId);

  return NextResponse.json(visibility);
}
