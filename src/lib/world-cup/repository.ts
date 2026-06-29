import { randomInt } from "crypto";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bonusPredictions,
  auditLog,
  leagueMembers,
  leagues,
  matchPredictions,
  matches as dbMatches,
  officialBonusResults,
  officialStageResults,
  scoreEvents,
  stagePredictions,
  teams as dbTeams,
  tournaments,
  users,
} from "@/db/schema";
import {
  matches as seedMatches,
  teams as seedTeams,
  tournament as seedTournament,
  formatVenue,
  type Match,
} from "@/lib/world-cup/data";
import { buildRoundOf32Pairs, type GroupRank } from "@/lib/world-cup/bracket";
import { getCompletedGroupQualifierRanks } from "@/lib/world-cup/group-standings";
import { getCompletedKnockoutQualifierTeams } from "@/lib/world-cup/stage-results";
import { scoreMatchPrediction, STAGE_POINTS, STAGE_REASON } from "@/lib/world-cup/scoring";

const TOURNAMENT_YEAR = 2026;
const TOP_SCORER_CHANGE_WINDOW_LOCK_AT = new Date("2026-06-13T09:00:00.000Z");
const LEGACY_SEED_VENUES = [
  "Mexico City Stadium",
  "Estadio Banorte",
  "Estadio Guadalajara",
  "Estadio Akron",
  "Toronto Stadium",
  "BMO Field",
  "Los Angeles Stadium",
  "SoFi Stadium",
  "Boston Stadium",
  "Gillette Stadium",
  "BC Place Vancouver",
  "BC Place",
  "New York New Jersey Stadium",
  "New York/New Jersey Stadium",
  "MetLife Stadium",
  "San Francisco Bay Area Stadium",
  "Levi's Stadium",
  "Philadelphia Stadium",
  "Lincoln Financial Field",
  "Houston Stadium",
  "NRG Stadium",
  "Dallas Stadium",
  "AT&T Stadium",
  "Estadio Monterrey",
  "Estadio BBVA",
  "Miami Stadium",
  "Hard Rock Stadium",
  "Atlanta Stadium",
  "Mercedes-Benz Stadium",
  "Seattle Stadium",
  "Lumen Field",
  "Kansas City Stadium",
  "GEHA Field at Arrowhead Stadium",
  "Knockout venue TBD",
];

type TournamentRow = typeof tournaments.$inferSelect;
type MatchRow = typeof dbMatches.$inferSelect;
export type LeagueGameMode = "stage_predictions" | "match_scores";
export type BonusPredictionType = "top_scorer" | "tournament_winner";
export type SeededMatchWithResult = Match & {
  dbId: number;
  homeScore?: number;
  awayScore?: number;
  winnerSide?: "home" | "away";
  status: "scheduled" | "live" | "final";
};

export type SavedPredictionMap = Record<
  string,
  {
    homeScore: number;
    awayScore: number;
    predictedWinnerSide?: "home" | "away";
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
  createdByUserId: number | null;
};

export type UserLeague = CurrentLeague & {
  createdAt: string;
  isOwner: boolean;
  members: {
    membershipId: number;
    userId: number;
    displayName: string;
    joinedAt: string;
    total: number;
  }[];
};

export type UserProfileSummary = {
  user: {
    id: number;
    name: string;
    email: string;
    role: "user" | "admin";
  };
  leagues: UserProfileLeague[];
};

export type UserProfileLeague = {
  leagueId: number;
  leagueName: string;
  inviteCode: string;
  gameMode: LeagueGameMode;
  displayName: string;
  total: number;
  rank: number;
  memberCount: number;
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

export type SavedStagePredictions = {
  teams: Record<string, string[]>;
  r32Ranks: Record<string, 1 | 2 | 3>;
};

export type LeaderboardRow = {
  userId: number;
  name: string;
  total: number;
  exactScores: number;
  results: number;
  stages: number;
  bonuses: number;
  details: LeaderboardDetail[];
};

export type LeaderboardDetail = {
  sourceType: "match_prediction" | "stage_prediction" | "bonus_prediction";
  reason: string;
  points: number;
  label: string;
  detail: string;
  leagueName?: string;
};

export type LeaderboardTable = {
  gameMode: LeagueGameMode;
  rows: LeaderboardRow[];
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
  predictedWinnerSide?: "home" | "away";
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

export type MobileLeagueStagePick = {
  teamId: string;
  teamName: string;
  teamCode: string;
  group: string | null;
  groupRank: 1 | 2 | 3 | null;
  successful: boolean | null;
};

export type MobileLeagueStagePrediction = {
  userId: number;
  submitted: boolean;
  randomPick: boolean;
  picks: MobileLeagueStagePick[];
};

export type MobileLeaguePredictionStage = {
  stage: "r32" | "r16" | "qf" | "sf" | "final" | "champion";
  expected: number;
  locked: boolean;
  predictions: MobileLeagueStagePrediction[];
};

export type MobileLeaguePredictionVisibility = {
  league: CurrentLeague | null;
  members: LeaguePredictionMember[];
  stages: MobileLeaguePredictionStage[];
};

export type RandomStageBackfillEntry = {
  leagueId: number;
  leagueName: string;
  userId: number;
  displayName: string;
  stage: StagePredictionStage;
  previousCount: number;
  generatedCount: number;
  teamIds: string[];
};

export type RandomStageBackfillSummary = {
  dryRun: boolean;
  lockedStages: StagePredictionStage[];
  checkedMembers: number;
  generatedStages: number;
  skippedCompleteStages: number;
  skippedStages: {
    leagueId: number;
    userId: number;
    stage: StagePredictionStage;
    reason: string;
  }[];
  entries: RandomStageBackfillEntry[];
};

export type AdminOfficialResults = {
  stages: Record<string, string[]>;
  topScorer?: string;
  tournamentWinner?: string;
};

export type AdminAuditEntry = {
  id: number;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
};

export type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  isEnabled: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
  createdAt: string;
  leagueCount: number;
  leagues: {
    id: number;
    name: string;
    inviteCode: string;
    gameMode: LeagueGameMode;
  }[];
};

export type AdminLeagueRow = {
  id: number;
  name: string;
  inviteCode: string;
  gameMode: LeagueGameMode;
  createdAt: string;
  creatorName: string | null;
  memberCount: number;
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

  if (existingTournament) {
    await db
      .update(tournaments)
      .set({
        name: seedTournament.name,
        firstMatchAt: new Date(seedTournament.firstMatchAtUtc),
        predictionLockAt: new Date(seedTournament.qualifierLockAtUtc),
      })
      .where(eq(tournaments.id, tournamentRow.id));
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
    .onConflictDoUpdate({
      target: [dbTeams.tournamentId, dbTeams.slug],
      set: {
        fifaCode: sql`excluded.fifa_code`,
        name: sql`excluded.name`,
        groupCode: sql`excluded.group_code`,
      },
    });

  const seededTeams = await db
    .select()
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const teamIdBySlug = new Map(seededTeams.map((team) => [team.slug, team.id]));

  if (seedMatches.length > 0) {
    await db.insert(dbMatches).values(
      seedMatches.map((match) => ({
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
    )
      .onConflictDoUpdate({
        target: [dbMatches.tournamentId, dbMatches.matchNumber],
        set: {
          stage: sql`excluded.stage`,
          groupCode: sql`excluded.group_code`,
          homeTeamId: sql`excluded.home_team_id`,
          awayTeamId: sql`excluded.away_team_id`,
          homePlaceholder: sql`excluded.home_placeholder`,
          awayPlaceholder: sql`excluded.away_placeholder`,
          kickoffAt: sql`excluded.kickoff_at`,
          venue: sql`excluded.venue`,
          updatedAt: new Date(),
        },
        setWhere: or(
          sql`${dbMatches.updatedAt} = ${dbMatches.createdAt}`,
          inArray(dbMatches.venue, LEGACY_SEED_VENUES),
        ),
      });
  }

  return tournamentRow;
}

async function getSeedTournamentForRead(): Promise<TournamentRow> {
  const [existingTournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.year, TOURNAMENT_YEAR))
    .limit(1);

  return existingTournament ?? ensureSeedTournament();
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
      createdByUserId: leagues.createdByUserId,
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
      createdByUserId: leagues.createdByUserId,
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
      createdByUserId: leagues.createdByUserId,
      createdAt: leagues.createdAt,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId))
    .orderBy(leagueMembers.joinedAt);

  const leagueIds = rows.map((row) => row.leagueId);
  const memberRows =
    leagueIds.length > 0
      ? await db
          .select({
            membershipId: leagueMembers.id,
            leagueId: leagueMembers.leagueId,
            userId: leagueMembers.userId,
            displayName: leagueMembers.displayName,
            joinedAt: leagueMembers.joinedAt,
          })
          .from(leagueMembers)
          .where(inArray(leagueMembers.leagueId, leagueIds))
          .orderBy(leagueMembers.joinedAt)
      : [];

  const events = leagueIds.length > 0 ? await getLeaderboardEventsForLeagues(leagueIds) : [];

  const pointsByLeagueAndUser = new Map<string, number>();
  for (const event of events) {
    const key = `${event.leagueId}:${event.userId}`;
    pointsByLeagueAndUser.set(key, (pointsByLeagueAndUser.get(key) ?? 0) + event.points);
  }

  const membersByLeagueId = memberRows.reduce<Map<number, UserLeague["members"]>>((acc, member) => {
    const members = acc.get(member.leagueId) ?? [];
    members.push({
      membershipId: member.membershipId,
      userId: member.userId,
      displayName: member.displayName,
      joinedAt: member.joinedAt.toISOString(),
      total: pointsByLeagueAndUser.get(`${member.leagueId}:${member.userId}`) ?? 0,
    });
    acc.set(member.leagueId, members);
    return acc;
  }, new Map());

  for (const members of membersByLeagueId.values()) {
    members.sort(
      (a, b) =>
        b.total - a.total ||
        a.displayName.localeCompare(b.displayName) ||
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
    );
  }

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    isOwner: row.createdByUserId === userId,
    members: membersByLeagueId.get(row.leagueId) ?? [],
  }));
}

export async function getUserProfileSummary(userId: number): Promise<UserProfileSummary | null> {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const memberships = await db
    .select({
      leagueId: leagues.id,
      leagueName: leagues.name,
      inviteCode: leagues.inviteCode,
      gameMode: leagues.gameMode,
      displayName: leagueMembers.displayName,
      joinedAt: leagueMembers.joinedAt,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId))
    .orderBy(leagueMembers.joinedAt);

  if (memberships.length === 0) {
    return { user, leagues: [] };
  }

  const leagueIds = memberships.map((membership) => membership.leagueId);
  const allMembers = await db
    .select({
      leagueId: leagueMembers.leagueId,
      userId: leagueMembers.userId,
      name: leagueMembers.displayName,
      joinedAt: leagueMembers.joinedAt,
    })
    .from(leagueMembers)
    .where(inArray(leagueMembers.leagueId, leagueIds));

  const events = await getLeaderboardEventsForLeagues(leagueIds);

  const pointsByLeagueAndUser = new Map<string, number>();
  for (const event of events) {
    const key = `${event.leagueId}:${event.userId}`;
    pointsByLeagueAndUser.set(key, (pointsByLeagueAndUser.get(key) ?? 0) + event.points);
  }

  const leaguesWithRanks = memberships.map<UserProfileLeague>((membership) => {
    const leagueMembersForRank = allMembers.filter((member) => member.leagueId === membership.leagueId);
    const ranked = leagueMembersForRank
      .map((member) => ({
        userId: member.userId,
        name: member.name,
        joinedAt: member.joinedAt,
        total: pointsByLeagueAndUser.get(`${member.leagueId}:${member.userId}`) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.total - a.total ||
          a.name.localeCompare(b.name) ||
          a.joinedAt.getTime() - b.joinedAt.getTime(),
      );
    const rank = ranked.findIndex((member) => member.userId === userId) + 1;

    return {
      leagueId: membership.leagueId,
      leagueName: membership.leagueName,
      inviteCode: membership.inviteCode,
      gameMode: membership.gameMode,
      displayName: membership.displayName,
      total: pointsByLeagueAndUser.get(`${membership.leagueId}:${userId}`) ?? 0,
      rank: rank || ranked.length,
      memberCount: ranked.length,
    };
  });

  return { user, leagues: leaguesWithRanks };
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
  const tournamentRow = await getSeedTournamentForRead();
  const rows = await db
    .select()
    .from(dbMatches)
    .where(eq(dbMatches.tournamentId, tournamentRow.id));
  const dbMatchByNumber = new Map(rows.map((match) => [match.matchNumber, match]));
  const seededTeams = await db
    .select({ id: dbTeams.id, slug: dbTeams.slug, group: dbTeams.groupCode, name: dbTeams.name })
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const slugByTeamId = new Map(seededTeams.map((team) => [team.id, team.slug]));
  const dbRankByTeamId = getCompletedGroupQualifierRanks(
    seededTeams,
    rows.map((match) => ({
      stage: match.stage,
      group: match.groupCode,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    })),
  );
  const seedRanks = Object.fromEntries(
    [...dbRankByTeamId.entries()].flatMap(([teamId, rank]) => {
      const slug = slugByTeamId.get(teamId);
      return slug ? [[slug, rank] as const] : [];
    }),
  );
  const derivedRoundOf32Pairs = buildRoundOf32Pairs(seedTeams, seedRanks);
  const fallbackRoundOf32Pairs =
    new Date() >= new Date(seedTournament.knockoutLockAtUtc)
      ? buildRoundOf32Pairs(seedTeams, FINAL_ROUND_OF_32_RANKS)
      : [];
  const derivedRoundOf32ByNumber = new Map(
    (derivedRoundOf32Pairs.every((pair) => pair.home && pair.away)
      ? derivedRoundOf32Pairs
      : fallbackRoundOf32Pairs
    )
      .map((pair) => [Number(pair.label.slice(1)), pair] as const)
      .filter(([matchNumber]) => Number.isFinite(matchNumber)),
  );

  return seedMatches
    .flatMap<SeededMatchWithResult>((seedMatch) => {
      const dbMatch = dbMatchByNumber.get(seedMatch.number);
      if (!dbMatch) return [];
      const derivedRoundOf32Pair =
        dbMatch.stage === "r32" ? derivedRoundOf32ByNumber.get(dbMatch.matchNumber) : undefined;
      const homeTeamId =
        dbMatch.homeTeamId ? slugByTeamId.get(dbMatch.homeTeamId) : derivedRoundOf32Pair?.home?.id;
      const awayTeamId =
        dbMatch.awayTeamId ? slugByTeamId.get(dbMatch.awayTeamId) : derivedRoundOf32Pair?.away?.id;
      const winnerSide: SeededMatchWithResult["winnerSide"] =
        dbMatch.winnerSide === "home" || dbMatch.winnerSide === "away"
          ? dbMatch.winnerSide
          : undefined;
      return [
        {
          ...seedMatch,
          dbId: dbMatch.id,
          stage: dbMatch.stage,
          group: dbMatch.groupCode ?? undefined,
          homeTeamId,
          awayTeamId,
          homePlaceholder: homeTeamId
            ? undefined
            : dbMatch.homePlaceholder ?? seedMatch.homePlaceholder ?? undefined,
          awayPlaceholder: awayTeamId
            ? undefined
            : dbMatch.awayPlaceholder ?? seedMatch.awayPlaceholder ?? undefined,
          kickoffAtUtc: dbMatch.kickoffAt.toISOString(),
          venue: formatVenue(dbMatch.venue),
          status: dbMatch.status,
          homeScore: dbMatch.homeScore ?? undefined,
          awayScore: dbMatch.awayScore ?? undefined,
          winnerSide,
        },
      ];
    })
    .sort(sortMatchesByKickoff);
}

export async function getSavedMatchPredictions(
  userId: number,
  activeLeagueId?: number | null,
): Promise<SavedPredictionMap> {
  const tournamentRow = await getSeedTournamentForRead();
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
      predictedWinnerSide: matchPredictions.predictedWinnerSide,
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
            predictedWinnerSide:
              row.predictedWinnerSide === "home" || row.predictedWinnerSide === "away"
                ? row.predictedWinnerSide
                : undefined,
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
  const tournamentRow = await getSeedTournamentForRead();
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
  const tournamentRow = await getSeedTournamentForRead();
  const league = await getCurrentLeague(userId, activeLeagueId);
  if (!league) return { teams: {}, r32Ranks: {} };

  const seededTeams = await db
    .select({ id: dbTeams.id, slug: dbTeams.slug })
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const slugByTeamId = new Map(seededTeams.map((team) => [team.id, team.slug]));

  const rows = await db
    .select({
      stage: stagePredictions.stage,
      teamId: stagePredictions.teamId,
      placeholderKey: stagePredictions.placeholderKey,
      groupRank: stagePredictions.groupRank,
    })
    .from(stagePredictions)
    .where(
      and(
        eq(stagePredictions.userId, userId),
        eq(stagePredictions.leagueId, league.leagueId),
        eq(stagePredictions.tournamentId, tournamentRow.id),
      ),
    );

  return rows.reduce<SavedStagePredictions>(
    (acc, row) => {
      const slug = row.teamId === null ? row.placeholderKey : slugByTeamId.get(row.teamId);
      if (!slug) return acc;
      acc.teams[row.stage] = [...(acc.teams[row.stage] ?? []), slug];
      if (
        row.stage === "r32" &&
        row.teamId !== null &&
        (row.groupRank === 1 || row.groupRank === 2 || row.groupRank === 3)
      ) {
        acc.r32Ranks[slug] = row.groupRank;
      }
      return acc;
    },
    { teams: {}, r32Ranks: {} },
  );
}

export async function getAdminOfficialResults(): Promise<AdminOfficialResults> {
  const tournamentRow = await ensureSeedTournament();
  const seededTeams = await db
    .select({ id: dbTeams.id, slug: dbTeams.slug })
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const slugByTeamId = new Map(seededTeams.map((team) => [team.id, team.slug]));

  const stageRows = await db
    .select({
      stage: officialStageResults.stage,
      teamId: officialStageResults.teamId,
    })
    .from(officialStageResults)
    .where(eq(officialStageResults.tournamentId, tournamentRow.id));

  const stages = stageRows.reduce<Record<string, string[]>>((acc, row) => {
    const slug = slugByTeamId.get(row.teamId);
    if (!slug) return acc;
    acc[row.stage] = [...(acc[row.stage] ?? []), slug];
    return acc;
  }, {});

  const bonusRows = await db
    .select()
    .from(officialBonusResults)
    .where(eq(officialBonusResults.tournamentId, tournamentRow.id));
  const topScorer = bonusRows.find((row) => row.type === "top_scorer")?.playerName ?? undefined;
  const winnerTeamId = bonusRows.find((row) => row.type === "tournament_winner")?.teamId;

  return {
    stages,
    topScorer,
    tournamentWinner: winnerTeamId ? slugByTeamId.get(winnerTeamId) : undefined,
  };
}

export async function getRecentAdminAuditEntries(limit = 20): Promise<AdminAuditEntry[]> {
  const rows = await db
    .select({
      id: auditLog.id,
      actorName: users.name,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      beforeJson: auditLog.beforeJson,
      afterJson: auditLog.afterJson,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorUserId, users.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    actorName: row.actorName ?? "Unknown admin",
    createdAt: row.createdAt.toISOString(),
  }));
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

  const events = await getLeaderboardEventsForLeagues([league.leagueId]);

  const rows = await buildLeaderboardRows(members, events);

  return {
    league,
    rows,
  };
}

export async function getAllLeaderboardTables(userId: number): Promise<LeaderboardTable[]> {
  const userLeagueRows = await db
    .select({
      leagueId: leagues.id,
      gameMode: leagues.gameMode,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId));

  const leagueIdsByMode = userLeagueRows.reduce<Record<LeagueGameMode, number[]>>(
    (acc, league) => {
      acc[league.gameMode].push(league.leagueId);
      return acc;
    },
    { match_scores: [], stage_predictions: [] },
  );

  const tables: LeaderboardTable[] = [];
  for (const gameMode of ["match_scores", "stage_predictions"] as const) {
    const leagueIds = leagueIdsByMode[gameMode];
    if (leagueIds.length === 0) {
      tables.push({ gameMode, rows: [] });
      continue;
    }

    const members = await db
      .select({
        userId: leagueMembers.userId,
        name: users.name,
      })
      .from(leagueMembers)
      .innerJoin(users, eq(leagueMembers.userId, users.id))
      .where(inArray(leagueMembers.leagueId, leagueIds));

    const events = await getLeaderboardEventsForLeagues(leagueIds);

    tables.push({ gameMode, rows: await buildLeaderboardRows(dedupeMembers(members), events) });
  }

  return tables;
}

async function getLeaderboardEventsForLeagues(leagueIds: number[]) {
  if (leagueIds.length === 0) return [];

  const storedEvents = await db
    .select({
      leagueId: scoreEvents.leagueId,
      userId: scoreEvents.userId,
      sourceType: scoreEvents.sourceType,
      sourceId: scoreEvents.sourceId,
      reason: scoreEvents.reason,
      points: scoreEvents.points,
      leagueName: leagues.name,
    })
    .from(scoreEvents)
    .innerJoin(leagues, eq(scoreEvents.leagueId, leagues.id))
    .where(
      and(
        inArray(scoreEvents.leagueId, leagueIds),
        ne(scoreEvents.sourceType, "match_prediction"),
      ),
    );

  const currentMatchEvents = await getCurrentMatchScoreLeaderboardEvents(leagueIds);
  const currentStageEvents = await getCurrentStagePredictionLeaderboardEvents(leagueIds);
  return dedupeLeaderboardEvents([...storedEvents, ...currentMatchEvents, ...currentStageEvents]);
}

function dedupeLeaderboardEvents<T extends { sourceType: string; sourceId: number }>(events: T[]): T[] {
  return Array.from(
    events.reduce((acc, event) => {
      acc.set(`${event.sourceType}:${event.sourceId}`, event);
      return acc;
    }, new Map<string, T>()).values(),
  );
}

async function getCurrentMatchScoreLeaderboardEvents(leagueIds: number[]) {
  const predictions = await db
    .select({
      userId: matchPredictions.userId,
      leagueId: matchPredictions.leagueId,
      sourceId: matchPredictions.id,
      predictedHomeScore: matchPredictions.homeScore,
      predictedAwayScore: matchPredictions.awayScore,
      matchNumber: dbMatches.matchNumber,
      realHomeScore: dbMatches.homeScore,
      realAwayScore: dbMatches.awayScore,
      status: dbMatches.status,
      leagueName: leagues.name,
    })
    .from(matchPredictions)
    .innerJoin(leagues, eq(matchPredictions.leagueId, leagues.id))
    .innerJoin(dbMatches, eq(matchPredictions.matchId, dbMatches.id))
    .innerJoin(
      leagueMembers,
      and(
        eq(leagueMembers.leagueId, matchPredictions.leagueId),
        eq(leagueMembers.userId, matchPredictions.userId),
      ),
    )
    .where(and(inArray(matchPredictions.leagueId, leagueIds), eq(leagues.gameMode, "match_scores")));

  return predictions.flatMap((prediction) => {
    if (
      prediction.status !== "final" ||
      prediction.realHomeScore === null ||
      prediction.realAwayScore === null
    ) {
      return [];
    }

    const result = scoreMatchPrediction({
      matchNumber: prediction.matchNumber,
      realHomeScore: prediction.realHomeScore,
      realAwayScore: prediction.realAwayScore,
      predictedHomeScore: prediction.predictedHomeScore,
      predictedAwayScore: prediction.predictedAwayScore,
    });
    if (result.points === 0) return [];

    return [
      {
        leagueId: prediction.leagueId,
        userId: prediction.userId,
        sourceType: "match_prediction" as const,
        sourceId: prediction.sourceId,
        reason: result.reason,
        points: result.points,
        leagueName: prediction.leagueName,
      },
    ];
  });
}

async function getCurrentStagePredictionLeaderboardEvents(leagueIds: number[]) {
  const officialRows = await db
    .select({
      tournamentId: officialStageResults.tournamentId,
      stage: officialStageResults.stage,
      teamId: officialStageResults.teamId,
    })
    .from(officialStageResults);

  const roundOf32FixtureRows = await db
    .select({
      tournamentId: dbMatches.tournamentId,
      stage: dbMatches.stage,
      status: dbMatches.status,
      homeTeamId: dbMatches.homeTeamId,
      awayTeamId: dbMatches.awayTeamId,
      winnerTeamId: dbMatches.winnerTeamId,
    })
    .from(dbMatches)
    .where(inArray(dbMatches.stage, ["r32", "r16", "qf", "sf", "final"]));

  const tournamentIds = [
    ...new Set([
      ...officialRows.map((row) => row.tournamentId),
      ...roundOf32FixtureRows.map((row) => row.tournamentId),
    ]),
  ];
  const tournamentTeams =
    tournamentIds.length > 0
      ? await db
          .select({
            id: dbTeams.id,
            tournamentId: dbTeams.tournamentId,
            group: dbTeams.groupCode,
            name: dbTeams.name,
          })
          .from(dbTeams)
          .where(inArray(dbTeams.tournamentId, tournamentIds))
      : [];
  const groupMatchRows =
    tournamentIds.length > 0
      ? await db
          .select({
            tournamentId: dbMatches.tournamentId,
            stage: dbMatches.stage,
            group: dbMatches.groupCode,
            homeTeamId: dbMatches.homeTeamId,
            awayTeamId: dbMatches.awayTeamId,
            status: dbMatches.status,
            homeScore: dbMatches.homeScore,
            awayScore: dbMatches.awayScore,
          })
          .from(dbMatches)
          .where(and(inArray(dbMatches.tournamentId, tournamentIds), eq(dbMatches.stage, "group")))
      : [];

  const officialTeamByStage = officialRows.reduce<Map<string, Set<number>>>((acc, row) => {
    const key = `${row.tournamentId}:${row.stage}`;
    const teamsForStage = acc.get(key) ?? new Set<number>();
    teamsForStage.add(row.teamId);
    acc.set(key, teamsForStage);
    return acc;
  }, new Map());

  for (const row of roundOf32FixtureRows.filter((match) => match.stage === "r32")) {
    const key = `${row.tournamentId}:r32`;
    const teamsForStage = officialTeamByStage.get(key) ?? new Set<number>();
    if (row.homeTeamId !== null) teamsForStage.add(row.homeTeamId);
    if (row.awayTeamId !== null) teamsForStage.add(row.awayTeamId);
    officialTeamByStage.set(key, teamsForStage);
  }

  for (const tournamentId of tournamentIds) {
    const knockoutWinners = getCompletedKnockoutQualifierTeams(
      roundOf32FixtureRows.filter((match) => match.tournamentId === tournamentId),
    );
    for (const [stage, teamIds] of knockoutWinners) {
      const key = `${tournamentId}:${stage}`;
      const teamsForStage = officialTeamByStage.get(key) ?? new Set<number>();
      for (const teamId of teamIds) teamsForStage.add(teamId);
      officialTeamByStage.set(key, teamsForStage);
    }

    const teamsForTournament = tournamentTeams.filter((team) => team.tournamentId === tournamentId);
    const matchesForTournament = groupMatchRows.filter((match) => match.tournamentId === tournamentId);
    const qualifierRanks = getCompletedGroupQualifierRanks(teamsForTournament, matchesForTournament);
    if (qualifierRanks.size === 0) continue;
    const key = `${tournamentId}:r32`;
    const teamsForStage = officialTeamByStage.get(key) ?? new Set<number>();
    for (const teamId of qualifierRanks.keys()) {
      teamsForStage.add(teamId);
    }
    officialTeamByStage.set(key, teamsForStage);
  }

  const predictions = await db
    .select({
      id: stagePredictions.id,
      userId: stagePredictions.userId,
      leagueId: stagePredictions.leagueId,
      tournamentId: stagePredictions.tournamentId,
      stage: stagePredictions.stage,
      teamId: stagePredictions.teamId,
      leagueName: leagues.name,
    })
    .from(stagePredictions)
    .innerJoin(leagues, eq(stagePredictions.leagueId, leagues.id))
    .innerJoin(
      leagueMembers,
      and(
        eq(leagueMembers.leagueId, stagePredictions.leagueId),
        eq(leagueMembers.userId, stagePredictions.userId),
      ),
    )
    .where(and(inArray(stagePredictions.leagueId, leagueIds), eq(leagues.gameMode, "stage_predictions")));

  return predictions.flatMap((prediction) => {
    if (prediction.teamId === null) return [];
    const officialTeams = officialTeamByStage.get(`${prediction.tournamentId}:${prediction.stage}`);
    if (!officialTeams?.has(prediction.teamId)) return [];
    return [
      {
        leagueId: prediction.leagueId,
        userId: prediction.userId,
        sourceType: "stage_prediction" as const,
        sourceId: prediction.id,
        reason: STAGE_REASON[prediction.stage],
        points: STAGE_POINTS[prediction.stage],
        leagueName: prediction.leagueName,
      },
    ];
  });
}

async function buildLeaderboardRows(
  members: { userId: number; name: string }[],
  events: {
    leagueId: number;
    userId: number;
    sourceType: "match_prediction" | "stage_prediction" | "bonus_prediction";
    sourceId: number;
    reason: string;
    points: number;
    leagueName?: string;
  }[],
): Promise<LeaderboardRow[]> {
  const detailBySource = await getLeaderboardDetailMap(events);

  return members
    .map<LeaderboardRow>((member) => {
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
        details: userEvents
          .map((event) => ({
            sourceType: event.sourceType,
            reason: event.reason,
            points: event.points,
            leagueName: event.leagueName,
            ...(detailBySource.get(`${event.sourceType}:${event.sourceId}`) ?? {
              label: event.reason,
              detail: "Scoring event",
            }),
          }))
          .sort((a, b) => b.points - a.points || a.label.localeCompare(b.label)),
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

function dedupeMembers(members: { userId: number; name: string }[]) {
  return Array.from(new Map(members.map((member) => [member.userId, member])).values());
}

async function getLeaderboardDetailMap(
  events: {
    sourceType: "match_prediction" | "stage_prediction" | "bonus_prediction";
    sourceId: number;
  }[],
): Promise<Map<string, { label: string; detail: string }>> {
  const detailBySource = new Map<string, { label: string; detail: string }>();
  const matchPredictionIds = events
    .filter((event) => event.sourceType === "match_prediction")
    .map((event) => event.sourceId);
  const stagePredictionIds = events
    .filter((event) => event.sourceType === "stage_prediction")
    .map((event) => event.sourceId);
  const bonusPredictionIds = events
    .filter((event) => event.sourceType === "bonus_prediction")
    .map((event) => event.sourceId);

  const teamIds = new Set<number>();

  const matchRows =
    matchPredictionIds.length > 0
      ? await db
          .select({
            id: matchPredictions.id,
            homeScore: matchPredictions.homeScore,
            awayScore: matchPredictions.awayScore,
            realHomeScore: dbMatches.homeScore,
            realAwayScore: dbMatches.awayScore,
            status: dbMatches.status,
            matchNumber: dbMatches.matchNumber,
            homeTeamId: dbMatches.homeTeamId,
            awayTeamId: dbMatches.awayTeamId,
            homePlaceholder: dbMatches.homePlaceholder,
            awayPlaceholder: dbMatches.awayPlaceholder,
          })
          .from(matchPredictions)
          .innerJoin(dbMatches, eq(matchPredictions.matchId, dbMatches.id))
          .where(inArray(matchPredictions.id, matchPredictionIds))
      : [];

  const stageRows =
    stagePredictionIds.length > 0
      ? await db
          .select({
            id: stagePredictions.id,
            stage: stagePredictions.stage,
            teamId: stagePredictions.teamId,
            placeholderKey: stagePredictions.placeholderKey,
          })
          .from(stagePredictions)
          .where(inArray(stagePredictions.id, stagePredictionIds))
      : [];

  const bonusRows =
    bonusPredictionIds.length > 0
      ? await db
          .select({
            id: bonusPredictions.id,
            type: bonusPredictions.type,
            playerName: bonusPredictions.playerName,
            teamId: bonusPredictions.teamId,
          })
          .from(bonusPredictions)
          .where(inArray(bonusPredictions.id, bonusPredictionIds))
      : [];

  for (const row of matchRows) {
    if (row.homeTeamId) teamIds.add(row.homeTeamId);
    if (row.awayTeamId) teamIds.add(row.awayTeamId);
  }
  for (const row of stageRows) {
    if (row.teamId !== null) teamIds.add(row.teamId);
  }
  for (const row of bonusRows) {
    if (row.teamId) teamIds.add(row.teamId);
  }

  const teamRows =
    teamIds.size > 0
      ? await db
          .select({ id: dbTeams.id, name: dbTeams.name, fifaCode: dbTeams.fifaCode })
          .from(dbTeams)
          .where(inArray(dbTeams.id, Array.from(teamIds)))
      : [];
  const teamById = new Map(teamRows.map((team) => [team.id, team]));

  for (const row of matchRows) {
    const home = row.homeTeamId ? teamById.get(row.homeTeamId)?.name : undefined;
    const away = row.awayTeamId ? teamById.get(row.awayTeamId)?.name : undefined;
    const actualScore =
      row.status === "final" && row.realHomeScore !== null && row.realAwayScore !== null
        ? ` · Actual ${row.realHomeScore}-${row.realAwayScore}`
        : "";
    detailBySource.set(`match_prediction:${row.id}`, {
      label: `Match ${row.matchNumber}: ${home ?? row.homePlaceholder ?? "TBD"} vs ${away ?? row.awayPlaceholder ?? "TBD"}`,
      detail: `Predicted ${row.homeScore}-${row.awayScore}${actualScore}`,
    });
  }

  for (const row of stageRows) {
    const team = row.teamId === null ? undefined : teamById.get(row.teamId);
    const placeholder = row.placeholderKey ? placeholderLabel(row.placeholderKey) : undefined;
    detailBySource.set(`stage_prediction:${row.id}`, {
      label: `${stagePredictionLabel(row.stage)}: ${team?.name ?? placeholder ?? "Unknown team"}`,
      detail: team?.fifaCode ?? (placeholder ? "Placeholder pick" : "Team pick"),
    });
  }

  for (const row of bonusRows) {
    const team = row.teamId ? teamById.get(row.teamId) : undefined;
    detailBySource.set(`bonus_prediction:${row.id}`, {
      label:
        row.type === "top_scorer"
          ? `Top scorer: ${row.playerName ?? "Unknown player"}`
          : `World Cup winner: ${team?.name ?? "Unknown team"}`,
      detail: row.type === "top_scorer" ? "Pre-tournament bonus" : team?.fifaCode ?? "Winner bonus",
    });
  }

  return detailBySource;
}

function stagePredictionLabel(stage: "r32" | "r16" | "qf" | "sf" | "final" | "champion"): string {
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

function placeholderLabel(value: string): string {
  return value.startsWith("placeholder:") ? value.slice("placeholder:".length) : value;
}

async function getOfficialStageTeamSets(tournamentId: number): Promise<Map<StagePredictionStage, Set<number>>> {
  const officialRows = await db
    .select({
      stage: officialStageResults.stage,
      teamId: officialStageResults.teamId,
    })
    .from(officialStageResults)
    .where(eq(officialStageResults.tournamentId, tournamentId));

  const officialTeamByStage = officialRows.reduce<Map<StagePredictionStage, Set<number>>>(
    (acc, row) => {
      const teamsForStage = acc.get(row.stage) ?? new Set<number>();
      teamsForStage.add(row.teamId);
      acc.set(row.stage, teamsForStage);
      return acc;
    },
    new Map(),
  );

  const roundOf32FixtureRows = await db
    .select({
      stage: dbMatches.stage,
      status: dbMatches.status,
      homeTeamId: dbMatches.homeTeamId,
      awayTeamId: dbMatches.awayTeamId,
      winnerTeamId: dbMatches.winnerTeamId,
    })
    .from(dbMatches)
    .where(and(eq(dbMatches.tournamentId, tournamentId), inArray(dbMatches.stage, ["r32", "r16", "qf", "sf", "final"])));
  const roundOf32Teams = officialTeamByStage.get("r32") ?? new Set<number>();
  for (const row of roundOf32FixtureRows.filter((match) => match.stage === "r32")) {
    if (row.homeTeamId !== null) roundOf32Teams.add(row.homeTeamId);
    if (row.awayTeamId !== null) roundOf32Teams.add(row.awayTeamId);
  }

  const [tournamentTeams, groupMatches] = await Promise.all([
    db
      .select({ id: dbTeams.id, group: dbTeams.groupCode, name: dbTeams.name })
      .from(dbTeams)
      .where(eq(dbTeams.tournamentId, tournamentId)),
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
      .where(and(eq(dbMatches.tournamentId, tournamentId), eq(dbMatches.stage, "group"))),
  ]);
  for (const teamId of getCompletedGroupQualifierRanks(tournamentTeams, groupMatches).keys()) {
    roundOf32Teams.add(teamId);
  }
  if (roundOf32Teams.size > 0) {
    officialTeamByStage.set("r32", roundOf32Teams);
  }

  for (const [stage, teamIds] of getCompletedKnockoutQualifierTeams(roundOf32FixtureRows)) {
    const teams = officialTeamByStage.get(stage) ?? new Set<number>();
    for (const teamId of teamIds) teams.add(teamId);
    officialTeamByStage.set(stage, teams);
  }

  return officialTeamByStage;
}

async function getKnockoutEliminatedStageByTeam(tournamentId: number): Promise<Map<number, StagePredictionStage>> {
  const rows = await db
    .select({
      stage: dbMatches.stage,
      status: dbMatches.status,
      homeTeamId: dbMatches.homeTeamId,
      awayTeamId: dbMatches.awayTeamId,
      winnerTeamId: dbMatches.winnerTeamId,
    })
    .from(dbMatches)
    .where(and(eq(dbMatches.tournamentId, tournamentId), inArray(dbMatches.stage, ["r32", "r16", "qf", "sf", "final"])));

  const eliminatedStageByTeam = new Map<number, StagePredictionStage>();
  for (const row of rows) {
    if (
      row.status !== "final" ||
      !isStagePredictionStage(row.stage) ||
      row.homeTeamId === null ||
      row.awayTeamId === null ||
      row.winnerTeamId === null
    ) {
      continue;
    }
    const loserTeamId =
      row.winnerTeamId === row.homeTeamId
        ? row.awayTeamId
        : row.winnerTeamId === row.awayTeamId
          ? row.homeTeamId
          : null;
    if (loserTeamId !== null) eliminatedStageByTeam.set(loserTeamId, row.stage);
  }

  return eliminatedStageByTeam;
}

function resolveStagePickSuccessful(
  stage: StagePredictionStage,
  teamId: number,
  officialTeamByStage: Map<StagePredictionStage, Set<number>>,
  eliminatedStageByTeam: Map<number, StagePredictionStage>,
): boolean | null {
  const officialTeams = officialTeamByStage.get(stage);
  if (officialTeams?.has(teamId)) return true;

  const officialCount = officialTeams?.size ?? 0;
  if (stage === "r32") {
    return officialCount >= stagePredictionExpectedCounts.r32 ? false : null;
  }

  const eliminatedStage = eliminatedStageByTeam.get(teamId);
  if (
    eliminatedStage &&
    stagePredictionOrder.indexOf(eliminatedStage) < stagePredictionOrder.indexOf(stage)
  ) {
    return false;
  }

  return officialCount >= stagePredictionExpectedCounts[stage] ? false : null;
}

function isStagePredictionStage(stage: string): stage is StagePredictionStage {
  return (stagePredictionOrder as readonly string[]).includes(stage);
}

function normalizeGroupRank(rank: number | null): 1 | 2 | 3 | null {
  if (rank === 1 || rank === 2 || rank === 3) return rank;
  return null;
}

const stagePredictionOrder = ["r32", "r16", "qf", "sf", "final", "champion"] as const;
type StagePredictionStage = (typeof stagePredictionOrder)[number];
const stagePredictionExpectedCounts = {
  r32: 32,
  r16: 16,
  qf: 8,
  sf: 4,
  final: 2,
  champion: 1,
} as const satisfies Record<StagePredictionStage, number>;
const FINAL_ROUND_OF_32_RANKS = {
  mexico: 1,
  "south-africa": 2,
  switzerland: 1,
  canada: 2,
  "bosnia-herzegovina": 3,
  brazil: 1,
  morocco: 2,
  usa: 1,
  australia: 2,
  paraguay: 3,
  germany: 1,
  "cote-divoire": 2,
  ecuador: 3,
  netherlands: 1,
  japan: 2,
  sweden: 3,
  belgium: 1,
  egypt: 2,
  spain: 1,
  "cabo-verde": 2,
  france: 1,
  norway: 2,
  senegal: 3,
  argentina: 1,
  austria: 2,
  algeria: 3,
  colombia: 1,
  portugal: 2,
  "dr-congo": 3,
  england: 1,
  croatia: 2,
  ghana: 3,
} as const satisfies Record<string, GroupRank>;
const previousStageByStage = {
  r16: "r32",
  qf: "r16",
  sf: "qf",
  final: "sf",
  champion: "final",
} as const satisfies Partial<Record<StagePredictionStage, StagePredictionStage>>;

type RandomBackfillTeam = {
  id: number;
  slug: string;
  name: string;
  groupCode: string | null;
};

type RandomBackfillPick = {
  teamId: number;
  teamSlug: string;
  groupRank: 1 | 2 | 3 | null;
};

export async function getMobileLeaguePredictionVisibility(
  userId: number,
  activeLeagueId?: number | null,
): Promise<MobileLeaguePredictionVisibility> {
  const tournamentRow = await getSeedTournamentForRead();
  const league = await getCurrentLeague(userId, activeLeagueId);
  if (!league) return { league: null, members: [], stages: [] };

  const members = await db
    .select({
      userId: leagueMembers.userId,
      name: leagueMembers.displayName,
    })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, league.leagueId))
    .orderBy(leagueMembers.joinedAt);

  if (league.gameMode !== "stage_predictions") {
    return { league, members, stages: [] };
  }

  const now = Date.now();
  const lockedStages = new Set(await getLockedStagePredictionStages(tournamentRow, new Date(now)));

  const visibleStageRows = [...stagePredictionOrder];

  const seededTeams = await db
    .select({
      id: dbTeams.id,
      slug: dbTeams.slug,
      name: dbTeams.name,
      fifaCode: dbTeams.fifaCode,
      groupCode: dbTeams.groupCode,
    })
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const teamByDbId = new Map(seededTeams.map((team) => [team.id, team]));
  const [officialTeamByStage, eliminatedStageByTeam] = await Promise.all([
    getOfficialStageTeamSets(tournamentRow.id),
    getKnockoutEliminatedStageByTeam(tournamentRow.id),
  ]);

  const rows = await db
    .select({
      id: stagePredictions.id,
      userId: stagePredictions.userId,
      stage: stagePredictions.stage,
      teamId: stagePredictions.teamId,
      placeholderKey: stagePredictions.placeholderKey,
      groupRank: stagePredictions.groupRank,
      source: stagePredictions.source,
    })
    .from(stagePredictions)
    .where(
      and(
        eq(stagePredictions.leagueId, league.leagueId),
        eq(stagePredictions.tournamentId, tournamentRow.id),
        inArray(stagePredictions.stage, [...visibleStageRows]),
      ),
    )
    .orderBy(stagePredictions.id);

  const rowsByUserAndStage = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.userId}:${row.stage}`;
    const stageRows = rowsByUserAndStage.get(key) ?? [];
    stageRows.push(row);
    rowsByUserAndStage.set(key, stageRows);
  }

  const stages = visibleStageRows.map<MobileLeaguePredictionStage>((stage) => ({
    stage,
    expected: stagePredictionExpectedCounts[stage],
    locked: lockedStages.has(stage),
    predictions: members.map<MobileLeagueStagePrediction>((member) => {
      const canRevealForMember = lockedStages.has(stage) || member.userId === userId;
      const stageRows = canRevealForMember
        ? (rowsByUserAndStage.get(`${member.userId}:${stage}`) ?? [])
        : [];
      const picks = stageRows.flatMap<MobileLeagueStagePick>((row) => {
        const team = row.teamId === null ? undefined : teamByDbId.get(row.teamId);
        const placeholder = row.placeholderKey ? placeholderLabel(row.placeholderKey) : undefined;
        if (!team && !placeholder) return [];
        return [
          {
            teamId: team?.slug ?? row.placeholderKey!,
            teamName: team?.name ?? placeholder!,
            teamCode: team?.fifaCode ?? placeholder!,
            group: team?.groupCode ?? null,
            groupRank: stage === "r32" ? normalizeGroupRank(row.groupRank) : null,
            successful: team
              ? resolveStagePickSuccessful(stage, team.id, officialTeamByStage, eliminatedStageByTeam)
              : null,
          },
        ];
      });

      return {
        userId: member.userId,
        submitted: stageRows.length === stagePredictionExpectedCounts[stage],
        randomPick:
          stageRows.length === stagePredictionExpectedCounts[stage] &&
          stageRows.every((row) => row.source === "calculated"),
        picks: stage === "r32" ? picks.sort(sortMobileStagePicks) : picks,
      };
    }),
  }));

  return { league, members, stages };
}

function sortMobileStagePicks(a: MobileLeagueStagePick, b: MobileLeagueStagePick): number {
  return (
    (a.group ?? "").localeCompare(b.group ?? "") ||
    (a.groupRank ?? 99) - (b.groupRank ?? 99) ||
    a.teamName.localeCompare(b.teamName)
  );
}

export async function backfillRandomLockedStagePredictions(options: {
  dryRun?: boolean;
  now?: Date;
} = {}): Promise<RandomStageBackfillSummary> {
  const dryRun = options.dryRun ?? false;
  const now = options.now ?? new Date();
  const tournamentRow = await ensureSeedTournament();
  const lockedStages = await getLockedStagePredictionStages(tournamentRow, now);

  const summary: RandomStageBackfillSummary = {
    dryRun,
    lockedStages,
    checkedMembers: 0,
    generatedStages: 0,
    skippedCompleteStages: 0,
    skippedStages: [],
    entries: [],
  };

  if (lockedStages.length === 0) {
    return summary;
  }

  const members = await db
    .select({
      leagueId: leagues.id,
      leagueName: leagues.name,
      userId: leagueMembers.userId,
      displayName: leagueMembers.displayName,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagues.gameMode, "stage_predictions"))
    .orderBy(leagues.id, leagueMembers.joinedAt);

  summary.checkedMembers = members.length;
  if (members.length === 0) {
    return summary;
  }

  const tournamentTeams = await db
    .select({
      id: dbTeams.id,
      slug: dbTeams.slug,
      name: dbTeams.name,
      groupCode: dbTeams.groupCode,
    })
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const teamsByDbId = new Map(tournamentTeams.map((team) => [team.id, team]));
  const teamsByGroup = groupTeamsForRandomBackfill(tournamentTeams);

  const existingRows = await db
    .select({
      leagueId: stagePredictions.leagueId,
      userId: stagePredictions.userId,
      stage: stagePredictions.stage,
      teamId: stagePredictions.teamId,
      groupRank: stagePredictions.groupRank,
      teamSlug: dbTeams.slug,
    })
    .from(stagePredictions)
    .innerJoin(dbTeams, eq(stagePredictions.teamId, dbTeams.id))
    .where(
      and(
        eq(stagePredictions.tournamentId, tournamentRow.id),
        inArray(stagePredictions.stage, lockedStages),
      ),
    )
    .orderBy(stagePredictions.id);

  const rowsByMemberAndStage = new Map<string, typeof existingRows>();
  for (const row of existingRows) {
    const key = `${row.leagueId}:${row.userId}:${row.stage}`;
    const rows = rowsByMemberAndStage.get(key) ?? [];
    rows.push(row);
    rowsByMemberAndStage.set(key, rows);
  }

  for (const member of members) {
    const picksByStage = new Map<StagePredictionStage, RandomBackfillPick[]>();

    for (const stage of lockedStages) {
      const expectedCount = stagePredictionExpectedCounts[stage];
      const existing = rowsByMemberAndStage.get(`${member.leagueId}:${member.userId}:${stage}`) ?? [];
      const existingPicks = existing.flatMap<RandomBackfillPick>((row) => {
        if (row.teamId === null) return [];
        const team = teamsByDbId.get(row.teamId);
        if (!team) return [];
        return [
          {
            teamId: row.teamId,
            teamSlug: team.slug,
            groupRank: stage === "r32" ? normalizeGroupRank(row.groupRank) : null,
          },
        ];
      });

      if (existingPicks.length === expectedCount) {
        picksByStage.set(stage, existingPicks);
        summary.skippedCompleteStages += 1;
        continue;
      }

      const generated =
        stage === "r32"
          ? buildRandomR32Picks(teamsByGroup)
          : buildRandomKnockoutStagePicks(stage, picksByStage);

      if (!generated) {
        summary.skippedStages.push({
          leagueId: member.leagueId,
          userId: member.userId,
          stage,
          reason: "Previous stage does not have enough picks to generate this stage.",
        });
        continue;
      }

      const entry: RandomStageBackfillEntry = {
        leagueId: member.leagueId,
        leagueName: member.leagueName,
        userId: member.userId,
        displayName: member.displayName,
        stage,
        previousCount: existingPicks.length,
        generatedCount: generated.length,
        teamIds: generated.map((pick) => pick.teamSlug),
      };

      if (!dryRun) {
        await db.transaction(async (tx) => {
          await tx
            .delete(stagePredictions)
            .where(
              and(
                eq(stagePredictions.userId, member.userId),
                eq(stagePredictions.leagueId, member.leagueId),
                eq(stagePredictions.tournamentId, tournamentRow.id),
                eq(stagePredictions.stage, stage),
              ),
            );

          await tx.insert(stagePredictions).values(
            generated.map((pick) => ({
              userId: member.userId,
              leagueId: member.leagueId,
              tournamentId: tournamentRow.id,
              stage,
              teamId: pick.teamId,
              groupRank: pick.groupRank,
              source: "calculated" as const,
              submittedAt: now,
              updatedAt: now,
            })),
          );

          await tx.insert(auditLog).values({
            actorUserId: null,
            action: "stage_prediction.random_backfill",
            entityType: "stage_prediction",
            entityId: `${member.leagueId}:${member.userId}:${stage}`,
            beforeJson: {
              leagueId: member.leagueId,
              userId: member.userId,
              stage,
              pickCount: existingPicks.length,
              teamIds: existingPicks.map((pick) => pick.teamSlug),
            },
            afterJson: entry,
          });
        });
      }

      picksByStage.set(stage, generated);
      summary.generatedStages += 1;
      summary.entries.push(entry);
    }
  }

  return summary;
}

async function getLockedStagePredictionStages(
  tournamentRow: Pick<TournamentRow, "id" | "predictionLockAt">,
  now: Date,
): Promise<StagePredictionStage[]> {
  const nowMs = now.getTime();
  const knockoutLockAt = await getKnockoutStageLockAt(tournamentRow.id);

  return stagePredictionOrder.filter((stage) =>
    stage === "r32"
      ? nowMs >= tournamentRow.predictionLockAt.getTime()
      : nowMs >= knockoutLockAt.getTime(),
  );
}

function groupTeamsForRandomBackfill(teams: RandomBackfillTeam[]) {
  const teamsByGroup = new Map<string, RandomBackfillTeam[]>();
  for (const team of teams) {
    if (!team.groupCode) {
      throw new Error(`Team ${team.slug} is missing a group code.`);
    }
    const groupTeams = teamsByGroup.get(team.groupCode) ?? [];
    groupTeams.push(team);
    teamsByGroup.set(team.groupCode, groupTeams);
  }

  if (teamsByGroup.size !== 12) {
    throw new Error(`Expected 12 World Cup groups, found ${teamsByGroup.size}.`);
  }

  for (const [group, groupTeams] of teamsByGroup) {
    if (groupTeams.length < 3) {
      throw new Error(`Group ${group} needs at least 3 teams for random qualifier picks.`);
    }
  }

  return teamsByGroup;
}

function buildRandomR32Picks(teamsByGroup: Map<string, RandomBackfillTeam[]>): RandomBackfillPick[] {
  const groups = [...teamsByGroup.keys()].sort();
  const thirdPlaceGroups = new Set(shuffle(groups).slice(0, 8));
  const picks: RandomBackfillPick[] = [];

  for (const group of groups) {
    const groupTeams = shuffle(teamsByGroup.get(group) ?? []);
    const first = groupTeams[0]!;
    const second = groupTeams[1]!;
    const third = groupTeams[2]!;

    picks.push({ teamId: first.id, teamSlug: first.slug, groupRank: 1 });
    picks.push({ teamId: second.id, teamSlug: second.slug, groupRank: 2 });
    if (thirdPlaceGroups.has(group)) {
      picks.push({ teamId: third.id, teamSlug: third.slug, groupRank: 3 });
    }
  }

  return picks;
}

function buildRandomKnockoutStagePicks(
  stage: Exclude<StagePredictionStage, "r32">,
  picksByStage: Map<StagePredictionStage, RandomBackfillPick[]>,
): RandomBackfillPick[] | null {
  const previousStage = previousStageByStage[stage];
  const previousPicks = previousStage ? (picksByStage.get(previousStage) ?? []) : [];
  const expectedCount = stagePredictionExpectedCounts[stage];

  if (previousPicks.length < expectedCount) {
    return null;
  }

  return shuffle(previousPicks)
    .slice(0, expectedCount)
    .map((pick) => ({ ...pick, groupRank: null }));
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const current = result[index]!;
    result[index] = result[swapIndex]!;
    result[swapIndex] = current;
  }
  return result;
}

export async function getLeaguePredictionVisibility(userId: number, activeLeagueId?: number | null): Promise<{
  league: CurrentLeague | null;
  members: LeaguePredictionMember[];
  matches: LeaguePredictionMatch[];
  bonuses: LeagueBonusPrediction[];
  stagePredictions: MobileLeaguePredictionStage[];
}> {
  const tournamentRow = await getSeedTournamentForRead();
  const league = await getCurrentLeague(userId, activeLeagueId);
  if (!league) return { league: null, members: [], matches: [], bonuses: [], stagePredictions: [] };

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
      venue: dbMatches.venue,
      status: dbMatches.status,
      homeScore: dbMatches.homeScore,
      awayScore: dbMatches.awayScore,
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
      predictedWinnerSide: matchPredictions.predictedWinnerSide,
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
  const visibleMatches = seedMatches
    .flatMap<LeaguePredictionMatch>((seedMatch) => {
      const dbMatch = dbMatchByNumber.get(seedMatch.number);
      if (!dbMatch) return [];
      const revealed = now >= dbMatch.kickoffAt.getTime();
      return [
        {
          ...seedMatch,
          dbId: dbMatch.id,
          kickoffAtUtc: dbMatch.kickoffAt.toISOString(),
          venue: formatVenue(dbMatch.venue),
          status: dbMatch.status,
          homeScore: dbMatch.homeScore ?? undefined,
          awayScore: dbMatch.awayScore ?? undefined,
          revealed,
          predictions: members.map((member) => {
            const prediction = predictionByUserAndMatch.get(`${member.userId}:${dbMatch.id}`);
            return {
              userId: member.userId,
              submitted: Boolean(prediction),
              revealed,
              homeScore: revealed ? prediction?.homeScore : undefined,
              awayScore: revealed ? prediction?.awayScore : undefined,
              predictedWinnerSide:
                revealed &&
                (prediction?.predictedWinnerSide === "home" ||
                  prediction?.predictedWinnerSide === "away")
                  ? prediction.predictedWinnerSide
                  : undefined,
            };
          }),
        },
      ];
    })
    .sort(sortMatchesByKickoff);

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
  const topScorerRevealed = now >= getBonusPredictionLockAt(tournamentRow, "top_scorer").getTime();
  const bonuses = members.map<LeagueBonusPrediction>((member) => {
    const topScorer = bonusByUserAndType.get(`${member.userId}:top_scorer`);
    const winner = bonusByUserAndType.get(`${member.userId}:tournament_winner`);
    return {
      userId: member.userId,
      topScorerSubmitted: Boolean(topScorer),
      topScorerRevealed,
      topScorer: topScorerRevealed ? topScorer?.playerName ?? undefined : undefined,
      winnerSubmitted: Boolean(winner),
      winnerRevealed: bonusRevealed,
      winnerTeamId: bonusRevealed && winner?.teamId ? slugByTeamId.get(winner.teamId) : undefined,
    };
  });

  const lockedStages = new Set(await getLockedStagePredictionStages(tournamentRow, new Date(now)));
  const stageRows = await db
    .select({
      userId: stagePredictions.userId,
      stage: stagePredictions.stage,
      teamId: stagePredictions.teamId,
      placeholderKey: stagePredictions.placeholderKey,
      groupRank: stagePredictions.groupRank,
      source: stagePredictions.source,
    })
    .from(stagePredictions)
    .where(
      and(
        eq(stagePredictions.leagueId, league.leagueId),
        eq(stagePredictions.tournamentId, tournamentRow.id),
        inArray(stagePredictions.stage, [...stagePredictionOrder]),
      ),
    )
    .orderBy(stagePredictions.id);

  const stageRowsByUserAndStage = new Map<string, typeof stageRows>();
  for (const row of stageRows) {
    const key = `${row.userId}:${row.stage}`;
    const rows = stageRowsByUserAndStage.get(key) ?? [];
    rows.push(row);
    stageRowsByUserAndStage.set(key, rows);
  }

  const seededTeamDetails = await db
    .select({
      id: dbTeams.id,
      slug: dbTeams.slug,
      name: dbTeams.name,
      fifaCode: dbTeams.fifaCode,
      groupCode: dbTeams.groupCode,
    })
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const teamByDbId = new Map(seededTeamDetails.map((team) => [team.id, team]));
  const [officialTeamByStage, eliminatedStageByTeam] = await Promise.all([
    getOfficialStageTeamSets(tournamentRow.id),
    getKnockoutEliminatedStageByTeam(tournamentRow.id),
  ]);

  const stagePredictionsByMember = stagePredictionOrder.map<MobileLeaguePredictionStage>((stage) => ({
    stage,
    expected: stagePredictionExpectedCounts[stage],
    locked: lockedStages.has(stage),
    predictions: members.map<MobileLeagueStagePrediction>((member) => {
      const canRevealForMember = lockedStages.has(stage) || member.userId === userId;
      const rows = canRevealForMember
        ? (stageRowsByUserAndStage.get(`${member.userId}:${stage}`) ?? [])
        : [];
      const picks = rows.flatMap<MobileLeagueStagePick>((row) => {
        const team = row.teamId === null ? undefined : teamByDbId.get(row.teamId);
        const placeholder = row.placeholderKey ? placeholderLabel(row.placeholderKey) : undefined;
        if (!team && !placeholder) return [];
        return [
          {
            teamId: team?.slug ?? row.placeholderKey!,
            teamName: team?.name ?? placeholder!,
            teamCode: team?.fifaCode ?? placeholder!,
            group: team?.groupCode ?? null,
            groupRank: stage === "r32" ? normalizeGroupRank(row.groupRank) : null,
            successful: team
              ? resolveStagePickSuccessful(stage, team.id, officialTeamByStage, eliminatedStageByTeam)
              : null,
          },
        ];
      });

      return {
        userId: member.userId,
        submitted: rows.length === stagePredictionExpectedCounts[stage],
        randomPick:
          rows.length === stagePredictionExpectedCounts[stage] &&
          rows.every((row) => row.source === "calculated"),
        picks: stage === "r32" ? picks.sort(sortMobileStagePicks) : picks,
      };
    }),
  }));

  return { league, members, matches: visibleMatches, bonuses, stagePredictions: stagePredictionsByMember };
}

export function getMatchLockAtUtc(match: Pick<MatchRow, "kickoffAt">): Date {
  return new Date(match.kickoffAt.getTime() - 5 * 60 * 1000);
}

function sortMatchesByKickoff<T extends { kickoffAtUtc: string; number: number }>(a: T, b: T): number {
  return new Date(a.kickoffAtUtc).getTime() - new Date(b.kickoffAtUtc).getTime() || a.number - b.number;
}

export function getPreTournamentLockAt(tournamentRow: Pick<TournamentRow, "predictionLockAt">): Date {
  return tournamentRow.predictionLockAt;
}

export function getBonusPredictionLockAt(
  tournamentRow: Pick<TournamentRow, "predictionLockAt">,
  type: BonusPredictionType,
): Date {
  return type === "top_scorer"
    ? TOP_SCORER_CHANGE_WINDOW_LOCK_AT
    : getPreTournamentLockAt(tournamentRow);
}

export async function getKnockoutStageLockAt(tournamentId: number): Promise<Date> {
  const [firstKnockoutMatch] = await db
    .select({ kickoffAt: dbMatches.kickoffAt })
    .from(dbMatches)
    .where(and(eq(dbMatches.tournamentId, tournamentId), eq(dbMatches.stage, "r32")))
    .orderBy(dbMatches.kickoffAt)
    .limit(1);

  if (!firstKnockoutMatch) {
    return new Date(seedTournament.knockoutLockAtUtc);
  }

  return new Date(firstKnockoutMatch.kickoffAt.getTime() - 60 * 60 * 1000);
}

export async function getUserAccessStatus(userId: number): Promise<{
  isEnabled: boolean;
  disabledReason: string | null;
} | null> {
  const [user] = await db
    .select({
      isEnabled: users.isEnabled,
      disabledReason: users.disabledReason,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isEnabled: users.isEnabled,
      disabledAt: users.disabledAt,
      disabledReason: users.disabledReason,
      createdAt: users.createdAt,
      leagueCount: sql<number>`count(${leagueMembers.id})::int`,
    })
    .from(users)
    .leftJoin(leagueMembers, eq(leagueMembers.userId, users.id))
    .groupBy(
      users.id,
      users.name,
      users.email,
      users.role,
      users.isEnabled,
      users.disabledAt,
      users.disabledReason,
      users.createdAt,
    )
    .orderBy(desc(users.createdAt));

  const userIds = rows.map((row) => row.id);
  const membershipRows =
    userIds.length > 0
      ? await db
          .select({
            userId: leagueMembers.userId,
            leagueId: leagues.id,
            leagueName: leagues.name,
            inviteCode: leagues.inviteCode,
            gameMode: leagues.gameMode,
          })
          .from(leagueMembers)
          .innerJoin(leagues, eq(leagues.id, leagueMembers.leagueId))
          .where(inArray(leagueMembers.userId, userIds))
          .orderBy(leagues.name)
      : [];

  const leaguesByUserId = membershipRows.reduce<Map<number, AdminUserRow["leagues"]>>(
    (acc, membership) => {
      const userLeagues = acc.get(membership.userId) ?? [];
      userLeagues.push({
        id: membership.leagueId,
        name: membership.leagueName,
        inviteCode: membership.inviteCode,
        gameMode: membership.gameMode,
      });
      acc.set(membership.userId, userLeagues);
      return acc;
    },
    new Map(),
  );

  return rows.map((row) => ({
    ...row,
    disabledAt: row.disabledAt ? row.disabledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    leagues: leaguesByUserId.get(row.id) ?? [],
  }));
}

export async function getAdminLeagues(): Promise<AdminLeagueRow[]> {
  const creator = users;
  const rows = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      inviteCode: leagues.inviteCode,
      gameMode: leagues.gameMode,
      createdAt: leagues.createdAt,
      creatorName: creator.name,
      memberCount: sql<number>`count(${leagueMembers.id})::int`,
    })
    .from(leagues)
    .leftJoin(creator, eq(creator.id, leagues.createdByUserId))
    .leftJoin(leagueMembers, eq(leagueMembers.leagueId, leagues.id))
    .groupBy(
      leagues.id,
      leagues.name,
      leagues.inviteCode,
      leagues.gameMode,
      leagues.createdAt,
      creator.name,
    )
    .orderBy(desc(leagues.createdAt));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}
