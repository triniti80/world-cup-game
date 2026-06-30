import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { getSeededMatchesWithResults } from "@/lib/world-cup/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const matches = await getSeededMatchesWithResults();
  return NextResponse.json({
    matches: matches.map((match) => ({
      id: match.id,
      number: match.number,
      stage: match.stage,
      group: match.group ?? null,
      homeTeamId: match.homeTeamId ?? null,
      awayTeamId: match.awayTeamId ?? null,
      homePlaceholder: match.homePlaceholder ?? null,
      awayPlaceholder: match.awayPlaceholder ?? null,
      kickoffAtUtc: match.kickoffAtUtc,
      venue: match.venue,
      status: match.status,
      homeScore: match.homeScore ?? null,
      awayScore: match.awayScore ?? null,
      homePenaltyScore: match.homePenaltyScore ?? null,
      awayPenaltyScore: match.awayPenaltyScore ?? null,
    })),
  });
}
