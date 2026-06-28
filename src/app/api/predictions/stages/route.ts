import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { matches as dbMatches, stagePredictions, teams as dbTeams } from "@/db/schema";
import { readActiveLeagueId, readSession } from "@/lib/session";
import {
  ensureSeedTournament,
  getCurrentLeague,
  getDbTeamIdForSeedTeamSlug,
  getKnockoutStageLockAt,
  getPreTournamentLockAt,
} from "@/lib/world-cup/repository";
import { teams } from "@/lib/world-cup/data";
import { getCompletedGroupQualifierRanks } from "@/lib/world-cup/group-standings";

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
  const lockAt =
    parsed.data.stage === "r32"
      ? getPreTournamentLockAt(tournament)
      : await getKnockoutStageLockAt(tournament.id);
  if (Date.now() >= lockAt.getTime()) {
    return NextResponse.json(
      {
        error:
          parsed.data.stage === "r32"
            ? "Group qualifier picks are locked."
            : "Knockout stage picks are locked.",
      },
      { status: 423 },
    );
  }

  const uniqueEntries = Array.from(new Set(parsed.data.teamIds));
  if (parsed.data.stage === "r32") {
    if (uniqueEntries.some(isPlaceholderKey)) {
      return NextResponse.json(
        { error: "Round of 32 qualifier picks must be real teams." },
        { status: 400 },
      );
    }
  }

  if (parsed.data.stage !== "r32") {
    if (uniqueEntries.length < 1 || uniqueEntries.length > stageExpectedCounts[parsed.data.stage]) {
      return NextResponse.json(
        { error: `${stageLabel(parsed.data.stage)} picks must include at least one entrant and no more than ${stageExpectedCounts[parsed.data.stage]}.` },
        { status: 400 },
      );
    }
  } else if (uniqueEntries.length !== stageExpectedCounts[parsed.data.stage]) {
    return NextResponse.json(
      { error: `${stageLabel(parsed.data.stage)} requires exactly ${stageExpectedCounts[parsed.data.stage]} teams.` },
      { status: 400 },
    );
  }

  if (parsed.data.stage === "r32") {
    const rankByTeam = parsed.data.r32Ranks ?? {};
    if (Object.keys(rankByTeam).length !== uniqueEntries.length) {
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
      if (!uniqueEntries.includes(teamSlug)) {
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

  const realTeamSlugs = uniqueEntries.filter((entry) => !isPlaceholderKey(entry));
  const placeholderKeys = uniqueEntries.filter(isPlaceholderKey);
  const teamIds = await Promise.all(
    realTeamSlugs.map((slug) => getDbTeamIdForSeedTeamSlug(tournament.id, slug)),
  );
  if (teamIds.some((teamId) => teamId === null)) {
    return NextResponse.json({ error: "One or more selected teams were not found." }, { status: 404 });
  }
  const teamIdBySlug = new Map(
    realTeamSlugs.map((slug, index) => [slug, teamIds[index]] as const),
  );
  const resolvedEntries = uniqueEntries.map((entry) =>
    isPlaceholderKey(entry)
      ? { entry, placeholderKey: entry }
      : { entry, teamId: teamIdBySlug.get(entry)! },
  );
  const resolvedTeamIds = resolvedEntries.flatMap((entry) =>
    entry.teamId === undefined ? [] : [entry.teamId],
  );

  if (parsed.data.stage === "r16") {
    const roundOf32Matches = await db
      .select({
        matchNumber: dbMatches.matchNumber,
        homeTeamId: dbMatches.homeTeamId,
        awayTeamId: dbMatches.awayTeamId,
      })
      .from(dbMatches)
      .where(and(eq(dbMatches.tournamentId, tournament.id), eq(dbMatches.stage, "r32")))
      .orderBy(dbMatches.matchNumber);

    const roundOf32FixturesReady =
      roundOf32Matches.length === stageExpectedCounts.r16 &&
      roundOf32Matches.every((match) => match.homeTeamId !== null && match.awayTeamId !== null);

    if (roundOf32FixturesReady) {
      if (placeholderKeys.length > 0 || uniqueEntries.length !== stageExpectedCounts.r16) {
        return NextResponse.json(
          { error: "Round of 16 requires one real-team winner from every Round of 32 match." },
          { status: 400 },
        );
      }

      const selectedTeamIds = new Set(resolvedTeamIds);
      const invalidMatch = roundOf32Matches.find((match) => {
        const homeSelected = selectedTeamIds.has(match.homeTeamId!);
        const awaySelected = selectedTeamIds.has(match.awayTeamId!);
        return Number(homeSelected) + Number(awaySelected) !== 1;
      });

      if (invalidMatch) {
        return NextResponse.json(
          { error: `Choose exactly one winner from Match ${invalidMatch.matchNumber}.` },
          { status: 400 },
        );
      }

      return saveStagePredictions({
        sessionUserId: session.userId,
        leagueId: league.leagueId,
        tournamentId: tournament.id,
        stage: parsed.data.stage,
        entries: resolvedEntries,
        r32Ranks: parsed.data.r32Ranks,
      });
    }

    const [tournamentTeams, groupMatches] = await Promise.all([
      db
        .select({
          id: dbTeams.id,
          group: dbTeams.groupCode,
          name: dbTeams.name,
        })
        .from(dbTeams)
        .where(eq(dbTeams.tournamentId, tournament.id)),
      db
        .select({
          stage: dbMatches.stage,
          group: dbMatches.groupCode,
          homeTeamId: dbMatches.homeTeamId,
          awayTeamId: dbMatches.awayTeamId,
          status: dbMatches.status,
          homeScore: dbMatches.homeScore,
          awayScore: dbMatches.awayScore,
        })
        .from(dbMatches)
        .where(and(eq(dbMatches.tournamentId, tournament.id), eq(dbMatches.stage, "group"))),
    ]);

    const knownRoundOf32TeamIds = new Set(getCompletedGroupQualifierRanks(tournamentTeams, groupMatches).keys());
    if (knownRoundOf32TeamIds.size > 0) {
      const unknownTeamId = resolvedTeamIds.find((teamId) => !knownRoundOf32TeamIds.has(teamId));
      if (unknownTeamId) {
        return NextResponse.json(
          { error: "Round of 16 picks must come from the known Round of 32 bracket teams." },
          { status: 400 },
        );
      }

      return saveStagePredictions({
        sessionUserId: session.userId,
        leagueId: league.leagueId,
        tournamentId: tournament.id,
        stage: parsed.data.stage,
        entries: resolvedEntries,
        r32Ranks: parsed.data.r32Ranks,
      });
    }
  }

  if (parsed.data.stage !== "r32") {
    const stage = parsed.data.stage;
    const previousStage = previousStageByStage[stage];
    const previousRows = await db
      .select({
        teamId: stagePredictions.teamId,
        placeholderKey: stagePredictions.placeholderKey,
      })
      .from(stagePredictions)
      .where(
        and(
          eq(stagePredictions.userId, session.userId),
          eq(stagePredictions.leagueId, league.leagueId),
          eq(stagePredictions.tournamentId, tournament.id),
          eq(stagePredictions.stage, previousStage),
        ),
      );

    if (previousRows.length === 0) {
      return NextResponse.json(
        { error: `Save ${stageLabel(previousStage)} before saving ${stageLabel(stage)}.` },
        { status: 400 },
      );
    }

    const previousEntryKeys = new Set(
      previousRows.flatMap((row) => {
        if (row.teamId !== null) return [`team:${row.teamId}`];
        if (row.placeholderKey) return [row.placeholderKey];
        return [];
      }),
    );
    const invalidEntry = resolvedEntries.find((entry) => {
      const key = entry.teamId === undefined ? entry.placeholderKey : `team:${entry.teamId}`;
      return !key || !previousEntryKeys.has(key);
    });
    if (invalidEntry) {
      return NextResponse.json(
        { error: `${stageLabel(stage)} picks must come from your saved ${stageLabel(previousStage)} picks.` },
        { status: 400 },
      );
    }
  }

  return saveStagePredictions({
    sessionUserId: session.userId,
    leagueId: league.leagueId,
    tournamentId: tournament.id,
    stage: parsed.data.stage,
    entries: resolvedEntries,
    r32Ranks: parsed.data.r32Ranks,
  });
}

async function saveStagePredictions({
  sessionUserId,
  leagueId,
  tournamentId,
  stage,
  entries,
  r32Ranks,
}: {
  sessionUserId: number;
  leagueId: number;
  tournamentId: number;
  stage: keyof typeof stageExpectedCounts;
  entries: Array<{ entry: string; teamId?: number; placeholderKey?: string }>;
  r32Ranks?: Record<string, 1 | 2 | 3>;
}) {
  await db.transaction(async (tx) => {
    await tx
      .delete(stagePredictions)
      .where(
        and(
          eq(stagePredictions.userId, sessionUserId),
          eq(stagePredictions.leagueId, leagueId),
          eq(stagePredictions.tournamentId, tournamentId),
          eq(stagePredictions.stage, stage),
        ),
      );

    const downstreamStages = downstreamStagesByStage[stage];
    if (downstreamStages.length > 0) {
      await tx
        .delete(stagePredictions)
        .where(
          and(
            eq(stagePredictions.userId, sessionUserId),
            eq(stagePredictions.leagueId, leagueId),
            eq(stagePredictions.tournamentId, tournamentId),
            inArray(stagePredictions.stage, [...downstreamStages]),
          ),
        );
    }

    if (entries.length > 0) {
      await tx.insert(stagePredictions).values(
        entries.map((entry) => ({
          userId: sessionUserId,
          leagueId,
          tournamentId,
          stage,
          teamId: entry.teamId ?? null,
          placeholderKey: entry.placeholderKey ?? null,
          groupRank:
            stage === "r32" && entry.teamId !== undefined
              ? (r32Ranks?.[entry.entry] ?? null)
              : null,
          source: "manual" as const,
        })),
      );
    }
  });

  return NextResponse.json({
    ok: true,
    stage,
    teamIds: entries.map((entry) => entry.entry),
  });
}

function isPlaceholderKey(value: string): boolean {
  return value.startsWith("placeholder:");
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
