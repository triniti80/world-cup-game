import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bonusPredictions,
  leagueMembers,
  leagues,
  matchPredictions,
  matches as dbMatches,
  scoreEvents,
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
export type SeededMatchWithResult = Match & {
  dbId: number;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "live" | "final";
};

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

export type LeaderboardRow = {
  userId: number;
  name: string;
  total: number;
  exactScores: number;
  results: number;
  stages: number;
  bonuses: number;
};

export type LeaguePredictionMember = {
  userId: number;
  name: string;
};

export type LeagueMatchPrediction = {
  userId: number;
  submitted: boolean;
  revealed: boolean;
  homeScore?: number;
  awayScore?: number;
};

export type LeaguePredictionMatch = Match & {
  dbId: number;
  revealed: boolean;
  predictions: LeagueMatchPrediction[];
};

export type LeagueBonusPrediction = {
  userId: number;
  topScorerSubmitted: boolean;
  topScorerRevealed: boolean;
  topScorer?: string;
  winnerSubmitted: boolean;
  winnerRevealed: boolean;
  winnerTeamId?: string;
};

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

export async function getCurrentLeague(
  userId: number,
  activeLeagueId?: number | null,
): Promise<CurrentLeague | null> {
  const baseSelect = db
    .select({
      membershipId: leagueMembers.id,
      leagueId: leagues.id,
      leagueName: leagues.name,
      inviteCode: leagues.inviteCode,
      gameMode: leagues.gameMode,
      displayName: leagueMembers.displayName,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id));

  if (activeLeagueId) {
    const [activeRow] = await baseSelect
      .where(and(eq(leagueMembers.userId, userId), eq(leagueMembers.leagueId, activeLeagueId)))
      .limit(1);
    if (activeRow) return activeRow;
  }

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

export async function getSeededMatchesWithResults(): Promise<SeededMatchWithResult[]> {
  const tournamentRow = await ensureSeedTournament();
  const rows = await db
    .select()
    .from(dbMatches)
    .where(eq(dbMatches.tournamentId, tournamentRow.id));
  const dbMatchByNumber = new Map(rows.map((match) => [match.matchNumber, match]));

  return seedMatches.flatMap((seedMatch) => {
    const dbMatch = dbMatchByNumber.get(seedMatch.number);
    if (!dbMatch) return [];
    return [
      {
        ...seedMatch,
        dbId: dbMatch.id,
        status: dbMatch.status,
        homeScore: dbMatch.homeScore ?? undefined,
        awayScore: dbMatch.awayScore ?? undefined,
      },
    ];
  });
}

export async function getSavedMatchPredictions(
  userId: number,
  activeLeagueId?: number | null,
): Promise<SavedPredictionMap> {
  const tournamentRow = await ensureSeedTournament();
  const league = await getCurrentLeague(userId, activeLeagueId);
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

export async function getSavedBonusPredictions(
  userId: number,
  activeLeagueId?: number | null,
): Promise<SavedBonusPredictions> {
  const tournamentRow = await ensureSeedTournament();
  const league = await getCurrentLeague(userId, activeLeagueId);
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

export async function getSavedStagePredictions(
  userId: number,
  activeLeagueId?: number | null,
): Promise<SavedStagePredictions> {
  const tournamentRow = await ensureSeedTournament();
  const league = await getCurrentLeague(userId, activeLeagueId);
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

export async function getLeaderboardRows(
  userId: number,
  activeLeagueId?: number | null,
): Promise<{
  league: CurrentLeague | null;
  rows: LeaderboardRow[];
}> {
  const league = await getCurrentLeague(userId, activeLeagueId);
  if (!league) return { league: null, rows: [] };

  const members = await db
    .select({
      userId: leagueMembers.userId,
      name: leagueMembers.displayName,
    })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, league.leagueId));

  const events = await db
    .select({
      userId: scoreEvents.userId,
      sourceType: scoreEvents.sourceType,
      reason: scoreEvents.reason,
      points: sql<number>`${scoreEvents.points}::int`,
    })
    .from(scoreEvents)
    .where(eq(scoreEvents.leagueId, league.leagueId));

  const rows = members.map<LeaderboardRow>((member) => {
    const userEvents = events.filter((event) => event.userId === member.userId);
    const exactScores = userEvents
      .filter((event) => event.sourceType === "match_prediction" && event.reason === "Exact score")
      .reduce((sum, event) => sum + event.points, 0);
    const results = userEvents
      .filter((event) => event.sourceType === "match_prediction" && event.reason === "Correct outcome")
      .reduce((sum, event) => sum + event.points, 0);
    const stages = userEvents
      .filter((event) => event.sourceType === "stage_prediction")
      .reduce((sum, event) => sum + event.points, 0);
    const bonuses = userEvents
      .filter((event) => event.sourceType === "bonus_prediction")
      .reduce((sum, event) => sum + event.points, 0);

    return {
      userId: member.userId,
      name: member.name,
      exactScores,
      results,
      stages,
      bonuses,
      total: exactScores + results + stages + bonuses,
    };
  });

  return {
    league,
    rows: rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
  };
}

export async function getLeaguePredictionVisibility(userId: number, activeLeagueId?: number | null): Promise<{
  league: CurrentLeague | null;
  members: LeaguePredictionMember[];
  matches: LeaguePredictionMatch[];
  bonuses: LeagueBonusPrediction[];
}> {
  const tournamentRow = await ensureSeedTournament();
  const league = await getCurrentLeague(userId, activeLeagueId);
  if (!league) return { league: null, members: [], matches: [], bonuses: [] };

  const members = await db
    .select({
      userId: leagueMembers.userId,
      name: leagueMembers.displayName,
    })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, league.leagueId))
    .orderBy(leagueMembers.joinedAt);

  const dbMatchRows = await db
    .select({
      id: dbMatches.id,
      matchNumber: dbMatches.matchNumber,
      kickoffAt: dbMatches.kickoffAt,
    })
    .from(dbMatches)
    .where(eq(dbMatches.tournamentId, tournamentRow.id));
  const dbMatchByNumber = new Map(dbMatchRows.map((match) => [match.matchNumber, match]));

  const predictions = await db
    .select({
      userId: matchPredictions.userId,
      matchId: matchPredictions.matchId,
      homeScore: matchPredictions.homeScore,
      awayScore: matchPredictions.awayScore,
    })
    .from(matchPredictions)
    .where(eq(matchPredictions.leagueId, league.leagueId));
  const predictionByUserAndMatch = new Map(
    predictions.map((prediction) => [
      `${prediction.userId}:${prediction.matchId}`,
      prediction,
    ]),
  );

  const now = Date.now();
  const visibleMatches = seedMatches.flatMap<LeaguePredictionMatch>((seedMatch) => {
    const dbMatch = dbMatchByNumber.get(seedMatch.number);
    if (!dbMatch) return [];
    const revealed = now >= dbMatch.kickoffAt.getTime();
    return [
      {
        ...seedMatch,
        dbId: dbMatch.id,
        revealed,
        predictions: members.map((member) => {
          const prediction = predictionByUserAndMatch.get(`${member.userId}:${dbMatch.id}`);
          return {
            userId: member.userId,
            submitted: Boolean(prediction),
            revealed,
            homeScore: revealed ? prediction?.homeScore : undefined,
            awayScore: revealed ? prediction?.awayScore : undefined,
          };
        }),
      },
    ];
  });

  const seededTeams = await db
    .select({ id: dbTeams.id, slug: dbTeams.slug })
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const slugByTeamId = new Map(seededTeams.map((team) => [team.id, team.slug]));

  const bonusRows = await db
    .select({
      userId: bonusPredictions.userId,
      type: bonusPredictions.type,
      playerName: bonusPredictions.playerName,
      teamId: bonusPredictions.teamId,
    })
    .from(bonusPredictions)
    .where(
      and(
        eq(bonusPredictions.leagueId, league.leagueId),
        eq(bonusPredictions.tournamentId, tournamentRow.id),
      ),
    );
  const bonusByUserAndType = new Map(
    bonusRows.map((bonus) => [`${bonus.userId}:${bonus.type}`, bonus]),
  );
  const bonusRevealed = now >= tournamentRow.firstMatchAt.getTime();

  const bonuses = members.map<LeagueBonusPrediction>((member) => {
    const topScorer = bonusByUserAndType.get(`${member.userId}:top_scorer`);
    const winner = bonusByUserAndType.get(`${member.userId}:tournament_winner`);
    return {
      userId: member.userId,
      topScorerSubmitted: Boolean(topScorer),
      topScorerRevealed: bonusRevealed,
      topScorer: bonusRevealed ? topScorer?.playerName ?? undefined : undefined,
      winnerSubmitted: Boolean(winner),
      winnerRevealed: bonusRevealed,
      winnerTeamId: bonusRevealed && winner?.teamId ? slugByTeamId.get(winner.teamId) : undefined,
    };
  });

  return { league, members, matches: visibleMatches, bonuses };
}

export function getMatchLockAtUtc(match: Pick<MatchRow, "kickoffAt">): Date {
  return new Date(match.kickoffAt.getTime() - 5 * 60 * 1000);
}

export function getPreTournamentLockAt(tournamentRow: Pick<TournamentRow, "predictionLockAt">): Date {
  return tournamentRow.predictionLockAt;
}
