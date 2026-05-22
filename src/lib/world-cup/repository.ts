import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bonusPredictions,
  leagueMembers,
  leagues,
  matchPredictions,
  matches as dbMatches,
  stagePredictions,
  teams as dbTeams,
  tournaments,
} from "@/db/schema";
import {
  matches as seedMatches,
  teams as seedTeams,
  tournament as seedTournament,
  type Match,
} from "@/lib/world-cup/data";

const TOURNAMENT_YEAR = 2026;

type TournamentRow = typeof tournaments.$inferSelect;
type MatchRow = typeof dbMatches.$inferSelect;
export type LeagueGameMode = "stage_predictions" | "match_scores";

export type SavedPredictionMap = Record<
  string,
  {
    homeScore: number;
    awayScore: number;
    updatedAt: string;
  }
>;

export type CurrentLeague = {
  membershipId: number;
  leagueId: number;
  leagueName: string;
  inviteCode: string;
  gameMode: LeagueGameMode;
  displayName: string;
};

export type UserLeague = CurrentLeague & {
  createdAt: string;
};

export type SavedBonusPredictions = {
  topScorer?: {
    playerName: string;
    updatedAt: string;
  };
  tournamentWinner?: {
    teamId: string;
    updatedAt: string;
  };
};

export type SavedStagePredictions = Record<string, string[]>;

export async function ensureSeedTournament(): Promise<TournamentRow> {
  const [existingTournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.year, TOURNAMENT_YEAR))
    .limit(1);

  const tournamentRow =
    existingTournament ??
    (
      await db
        .insert(tournaments)
        .values({
          name: seedTournament.name,
          year: TOURNAMENT_YEAR,
          firstMatchAt: new Date(seedTournament.firstMatchAtUtc),
          predictionLockAt: new Date(seedTournament.qualifierLockAtUtc),
        })
        .returning()
    )[0];

  if (!tournamentRow) {
    throw new Error("Could not create tournament seed data.");
  }

  await db
    .insert(dbTeams)
    .values(
      seedTeams.map((team) => ({
        tournamentId: tournamentRow.id,
        slug: team.id,
        fifaCode: team.code,
        name: team.name,
        groupCode: team.group,
      })),
    )
    .onConflictDoNothing({ target: [dbTeams.tournamentId, dbTeams.slug] });

  const seededTeams = await db
    .select()
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const teamIdBySlug = new Map(seededTeams.map((team) => [team.slug, team.id]));

  const existingMatches = await db
    .select({ matchNumber: dbMatches.matchNumber })
    .from(dbMatches)
    .where(eq(dbMatches.tournamentId, tournamentRow.id));
  const existingMatchNumbers = new Set(existingMatches.map((match) => match.matchNumber));

  const missingMatches = seedMatches.filter((match) => !existingMatchNumbers.has(match.number));
  if (missingMatches.length > 0) {
    await db.insert(dbMatches).values(
      missingMatches.map((match) => ({
        tournamentId: tournamentRow.id,
        matchNumber: match.number,
        stage: match.stage,
        groupCode: match.group ?? null,
        homeTeamId: match.homeTeamId ? teamIdBySlug.get(match.homeTeamId) : null,
        awayTeamId: match.awayTeamId ? teamIdBySlug.get(match.awayTeamId) : null,
        homePlaceholder: match.homePlaceholder ?? null,
        awayPlaceholder: match.awayPlaceholder ?? null,
        kickoffAt: new Date(match.kickoffAtUtc),
        venue: match.venue,
        status: match.status,
        homeScore: match.homeScore ?? null,
        awayScore: match.awayScore ?? null,
      })),
    );
  }

  return tournamentRow;
}

export async function getPrimaryLeagueMembership(userId: number) {
  const [membership] = await db
    .select()
    .from(leagueMembers)
    .where(eq(leagueMembers.userId, userId))
    .limit(1);

  return membership ?? null;
}

export async function getCurrentLeague(userId: number): Promise<CurrentLeague | null> {
  const [row] = await db
    .select({
      membershipId: leagueMembers.id,
      leagueId: leagues.id,
      leagueName: leagues.name,
      inviteCode: leagues.inviteCode,
      gameMode: leagues.gameMode,
      displayName: leagueMembers.displayName,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId))
    .orderBy(leagueMembers.joinedAt)
    .limit(1);

  return row ?? null;
}

export async function getUserLeagues(userId: number): Promise<UserLeague[]> {
  const rows = await db
    .select({
      membershipId: leagueMembers.id,
      leagueId: leagues.id,
      leagueName: leagues.name,
      inviteCode: leagues.inviteCode,
      gameMode: leagues.gameMode,
      displayName: leagueMembers.displayName,
      createdAt: leagues.createdAt,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId))
    .orderBy(leagueMembers.joinedAt);

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export function getSeedMatchById(matchId: string): Match | null {
  return seedMatches.find((match) => match.id === matchId) ?? null;
}

export async function getDbMatchForSeedMatch(seedMatch: Match): Promise<MatchRow | null> {
  const tournamentRow = await ensureSeedTournament();
  const [matchRow] = await db
    .select()
    .from(dbMatches)
    .where(
      and(
        eq(dbMatches.tournamentId, tournamentRow.id),
        eq(dbMatches.matchNumber, seedMatch.number),
      ),
    )
    .limit(1);

  return matchRow ?? null;
}

export async function getSavedMatchPredictions(userId: number): Promise<SavedPredictionMap> {
  const tournamentRow = await ensureSeedTournament();
  const league = await getCurrentLeague(userId);
  if (!league) return {};

  const seededDbMatches = await db
    .select({ id: dbMatches.id, matchNumber: dbMatches.matchNumber })
    .from(dbMatches)
    .where(eq(dbMatches.tournamentId, tournamentRow.id));
  const seedIdByMatchNumber = new Map(seedMatches.map((match) => [match.number, match.id]));
  const seedIdByDbMatchId = new Map(
    seededDbMatches
      .map((match) => [match.id, seedIdByMatchNumber.get(match.matchNumber)] as const)
      .filter((entry): entry is readonly [number, string] => Boolean(entry[1])),
  );

  const rows = await db
    .select({
      matchId: matchPredictions.matchId,
      homeScore: matchPredictions.homeScore,
      awayScore: matchPredictions.awayScore,
      updatedAt: matchPredictions.updatedAt,
    })
    .from(matchPredictions)
    .where(
      and(
        eq(matchPredictions.userId, userId),
        eq(matchPredictions.leagueId, league.leagueId),
      ),
    );

  return Object.fromEntries(
    rows.flatMap((row) => {
      const seedId = seedIdByDbMatchId.get(row.matchId);
      if (!seedId) return [];
      return [
        [
          seedId,
          {
            homeScore: row.homeScore,
            awayScore: row.awayScore,
            updatedAt: row.updatedAt.toISOString(),
          },
        ],
      ];
    }),
  );
}

export async function getSavedBonusPredictions(userId: number): Promise<SavedBonusPredictions> {
  const tournamentRow = await ensureSeedTournament();
  const league = await getCurrentLeague(userId);
  if (!league) return {};

  const seededTeams = await db
    .select({ id: dbTeams.id, slug: dbTeams.slug })
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const slugByTeamId = new Map(seededTeams.map((team) => [team.id, team.slug]));

  const rows = await db
    .select()
    .from(bonusPredictions)
    .where(
      and(
        eq(bonusPredictions.userId, userId),
        eq(bonusPredictions.leagueId, league.leagueId),
        eq(bonusPredictions.tournamentId, tournamentRow.id),
      ),
    );

  const topScorer = rows.find((row) => row.type === "top_scorer");
  const tournamentWinner = rows.find((row) => row.type === "tournament_winner");

  return {
    topScorer: topScorer?.playerName
      ? {
          playerName: topScorer.playerName,
          updatedAt: topScorer.updatedAt.toISOString(),
        }
      : undefined,
    tournamentWinner:
      tournamentWinner?.teamId && slugByTeamId.has(tournamentWinner.teamId)
        ? {
            teamId: slugByTeamId.get(tournamentWinner.teamId)!,
            updatedAt: tournamentWinner.updatedAt.toISOString(),
          }
        : undefined,
  };
}

export async function getSavedStagePredictions(userId: number): Promise<SavedStagePredictions> {
  const tournamentRow = await ensureSeedTournament();
  const league = await getCurrentLeague(userId);
  if (!league) return {};

  const seededTeams = await db
    .select({ id: dbTeams.id, slug: dbTeams.slug })
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const slugByTeamId = new Map(seededTeams.map((team) => [team.id, team.slug]));

  const rows = await db
    .select({
      stage: stagePredictions.stage,
      teamId: stagePredictions.teamId,
    })
    .from(stagePredictions)
    .where(
      and(
        eq(stagePredictions.userId, userId),
        eq(stagePredictions.leagueId, league.leagueId),
        eq(stagePredictions.tournamentId, tournamentRow.id),
      ),
    );

  return rows.reduce<SavedStagePredictions>((acc, row) => {
    const slug = slugByTeamId.get(row.teamId);
    if (!slug) return acc;
    acc[row.stage] = [...(acc[row.stage] ?? []), slug];
    return acc;
  }, {});
}

export async function getDbTeamIdForSeedTeamSlug(
  tournamentId: number,
  slug: string,
): Promise<number | null> {
  const [team] = await db
    .select({ id: dbTeams.id })
    .from(dbTeams)
    .where(and(eq(dbTeams.tournamentId, tournamentId), eq(dbTeams.slug, slug)))
    .limit(1);

  return team?.id ?? null;
}

export function getMatchLockAtUtc(match: Pick<MatchRow, "kickoffAt">): Date {
  return new Date(match.kickoffAt.getTime() - 5 * 60 * 1000);
}

export function getPreTournamentLockAt(tournamentRow: Pick<TournamentRow, "predictionLockAt">): Date {
  return tournamentRow.predictionLockAt;
}
