import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { stagePredictions } from "@/db/schema";
import { readActiveLeagueId, readSession } from "@/lib/session";
import {
  ensureSeedTournament,
  getCurrentLeague,
  getDbTeamIdForSeedTeamSlug,
  getPreTournamentLockAt,
} from "@/lib/world-cup/repository";
import { teams } from "@/lib/world-cup/data";

const stageSchema = z.enum(["r32", "r16", "qf", "sf", "final", "champion"]);
const bodySchema = z.object({
  stage: stageSchema,
  teamIds: z.array(z.string().min(1)).max(48),
  r32Ranks: z.record(z.string(), z.union([z.literal(1), z.literal(2), z.literal(3)])).optional(),
});

const stageExpectedCounts = {
  r32: 32,
  r16: 16,
  qf: 8,
  sf: 4,
  final: 2,
  champion: 1,
} as const;

const previousStageByStage = {
  r16: "r32",
  qf: "r16",
  sf: "qf",
  final: "sf",
  champion: "final",
} as const;

const downstreamStagesByStage = {
  r32: ["r16", "qf", "sf", "final", "champion"],
  r16: ["qf", "sf", "final", "champion"],
  qf: ["sf", "final", "champion"],
  sf: ["final", "champion"],
  final: ["champion"],
  champion: [],
} as const;

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
    return NextResponse.json({ error: "Invalid stage prediction." }, { status: 400 });
  }

  const activeLeagueId = await readActiveLeagueId();
  const league = await getCurrentLeague(session.userId, activeLeagueId);
  if (!league) {
    return NextResponse.json({ error: "Join a league before saving predictions." }, { status: 409 });
  }
  if (league.gameMode !== "stage_predictions") {
    return NextResponse.json(
      { error: "This league uses match score guessing, not stage predictions." },
      { status: 409 },
    );
  }

  const tournament = await ensureSeedTournament();
  const lockAt = getPreTournamentLockAt(tournament);
  if (Date.now() >= lockAt.getTime()) {
    return NextResponse.json(
      { error: "Pre-tournament stage picks are locked." },
      { status: 423 },
    );
  }

  const uniqueTeamSlugs = Array.from(new Set(parsed.data.teamIds));
  if (uniqueTeamSlugs.length !== stageExpectedCounts[parsed.data.stage]) {
    return NextResponse.json(
      { error: `${stageLabel(parsed.data.stage)} requires exactly ${stageExpectedCounts[parsed.data.stage]} teams.` },
      { status: 400 },
    );
  }

  if (parsed.data.stage === "r32") {
    const rankByTeam = parsed.data.r32Ranks ?? {};
    if (Object.keys(rankByTeam).length !== uniqueTeamSlugs.length) {
      return NextResponse.json(
        { error: "Every Round of 32 team must have a group rank." },
        { status: 400 },
      );
    }

    const firstPlaceCount = Object.values(rankByTeam).filter((rank) => rank === 1).length;
    const secondPlaceCount = Object.values(rankByTeam).filter((rank) => rank === 2).length;
    const thirdPlaceCount = Object.values(rankByTeam).filter((rank) => rank === 3).length;
    if (firstPlaceCount !== 12 || secondPlaceCount !== 12 || thirdPlaceCount !== 8) {
      return NextResponse.json(
        { error: "Round of 32 requires 12 first-place, 12 second-place, and 8 third-place teams." },
        { status: 400 },
      );
    }

    const rankByGroup = new Map<string, Set<1 | 2 | 3>>();
    for (const [teamSlug, rank] of Object.entries(rankByTeam)) {
      if (!uniqueTeamSlugs.includes(teamSlug)) {
        return NextResponse.json(
          { error: "Round of 32 rank data must match selected teams." },
          { status: 400 },
        );
      }
      const team = teams.find((candidate) => candidate.id === teamSlug);
      if (!team) continue;
      const groupRanks = rankByGroup.get(team.group) ?? new Set<1 | 2 | 3>();
      if (groupRanks.has(rank)) {
        return NextResponse.json(
          { error: `Group ${team.group} can only have one ${rankLabel(rank)} team.` },
          { status: 400 },
        );
      }
      groupRanks.add(rank);
      rankByGroup.set(team.group, groupRanks);
    }

    for (const group of Array.from(new Set(teams.map((team) => team.group)))) {
      const groupRanks = rankByGroup.get(group);
      if (!groupRanks?.has(1) || !groupRanks.has(2)) {
        return NextResponse.json(
          { error: `Group ${group} must have a 1st-place and 2nd-place team.` },
          { status: 400 },
        );
      }
    }
  }

  const teamIds = await Promise.all(
    uniqueTeamSlugs.map((slug) => getDbTeamIdForSeedTeamSlug(tournament.id, slug)),
  );
  if (teamIds.some((teamId) => teamId === null)) {
    return NextResponse.json({ error: "One or more selected teams were not found." }, { status: 404 });
  }
  const resolvedTeamIds = teamIds.filter((teamId): teamId is number => teamId !== null);

  if (parsed.data.stage !== "r32") {
    const previousStage = previousStageByStage[parsed.data.stage];
    const previousRows = await db
      .select({ teamId: stagePredictions.teamId })
      .from(stagePredictions)
      .where(
        and(
          eq(stagePredictions.userId, session.userId),
          eq(stagePredictions.leagueId, league.leagueId),
          eq(stagePredictions.tournamentId, tournament.id),
          eq(stagePredictions.stage, previousStage),
        ),
      );

    if (previousRows.length !== stageExpectedCounts[previousStage]) {
      return NextResponse.json(
        { error: `Save a complete ${stageLabel(previousStage)} before saving ${stageLabel(parsed.data.stage)}.` },
        { status: 400 },
      );
    }

    const previousTeamIds = new Set(previousRows.map((row) => row.teamId));
    if (resolvedTeamIds.some((teamId) => !previousTeamIds.has(teamId))) {
      return NextResponse.json(
        { error: `${stageLabel(parsed.data.stage)} picks must come from your saved ${stageLabel(previousStage)} picks.` },
        { status: 400 },
      );
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(stagePredictions)
      .where(
        and(
          eq(stagePredictions.userId, session.userId),
          eq(stagePredictions.leagueId, league.leagueId),
          eq(stagePredictions.tournamentId, tournament.id),
          eq(stagePredictions.stage, parsed.data.stage),
        ),
      );

    const downstreamStages = downstreamStagesByStage[parsed.data.stage];
    if (downstreamStages.length > 0) {
      await tx
        .delete(stagePredictions)
        .where(
          and(
            eq(stagePredictions.userId, session.userId),
            eq(stagePredictions.leagueId, league.leagueId),
            eq(stagePredictions.tournamentId, tournament.id),
            inArray(stagePredictions.stage, [...downstreamStages]),
          ),
        );
    }

    if (resolvedTeamIds.length > 0) {
      await tx.insert(stagePredictions).values(
        resolvedTeamIds.map((teamId, index) => ({
          userId: session.userId,
          leagueId: league.leagueId,
          tournamentId: tournament.id,
          stage: parsed.data.stage,
          teamId,
          groupRank:
            parsed.data.stage === "r32" && uniqueTeamSlugs[index]
              ? (parsed.data.r32Ranks?.[uniqueTeamSlugs[index]] ?? null)
              : null,
          source: "manual" as const,
        })),
      );
    }
  });

  return NextResponse.json({
    ok: true,
    stage: parsed.data.stage,
    teamIds: uniqueTeamSlugs,
  });
}

function rankLabel(rank: 1 | 2 | 3): string {
  if (rank === 1) return "1st-place";
  if (rank === 2) return "2nd-place";
  return "3rd-place";
}

function stageLabel(stage: keyof typeof stageExpectedCounts): string {
  switch (stage) {
    case "r32":
      return "Round of 32";
    case "r16":
      return "Round of 16";
    case "qf":
      return "Quarter-finals";
    case "sf":
      return "Semi-finals";
    case "final":
      return "Final";
    case "champion":
      return "Champion";
  }
}
