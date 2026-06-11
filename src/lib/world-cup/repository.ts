import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
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
  type Match,
} from "@/lib/world-cup/data";

const TOURNAMENT_YEAR = 2026;
const LEGACY_SEED_VENUES = [
  "Mexico City Stadium",
  "Estadio Guadalajara",
  "Toronto Stadium",
  "Los Angeles Stadium",
  "Boston Stadium",
  "BC Place Vancouver",
  "New York New Jersey Stadium",
  "San Francisco Bay Area Stadium",
  "Philadelphia Stadium",
  "Houston Stadium",
  "Dallas Stadium",
  "Estadio Monterrey",
  "Miami Stadium",
  "Atlanta Stadium",
  "Seattle Stadium",
  "Knockout venue TBD",
];

type TournamentRow = typeof tournaments.$inferSelect;
type MatchRow = typeof dbMatches.$inferSelect;
export type LeagueGameMode = "stage_predictions" | "match_scores";
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

export type LeagueR32Prediction = {
  userId: number;
  submitted: boolean;
  revealed: boolean;
  picks: {
    teamId: string;
    groupRank: 1 | 2 | 3;
  }[];
};

export type MobileLeagueStagePick = {
  teamId: string;
  teamName: string;
  teamCode: string;
  group: string | null;
  groupRank: 1 | 2 | 3 | null;
};

export type MobileLeagueStagePrediction = {
  userId: number;
  submitted: boolean;
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

  const events =
    leagueIds.length > 0
      ? await db
          .select({
            leagueId: scoreEvents.leagueId,
            userId: scoreEvents.userId,
            points: sql<number>`${scoreEvents.points}::int`,
          })
          .from(scoreEvents)
          .where(inArray(scoreEvents.leagueId, leagueIds))
      : [];

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

  const events = await db
    .select({
      leagueId: scoreEvents.leagueId,
      userId: scoreEvents.userId,
      points: sql<number>`${scoreEvents.points}::int`,
    })
    .from(scoreEvents)
    .where(inArray(scoreEvents.leagueId, leagueIds));

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
    .select({ id: dbTeams.id, slug: dbTeams.slug })
    .from(dbTeams)
    .where(eq(dbTeams.tournamentId, tournamentRow.id));
  const slugByTeamId = new Map(seededTeams.map((team) => [team.id, team.slug]));

  return seedMatches.flatMap((seedMatch) => {
    const dbMatch = dbMatchByNumber.get(seedMatch.number);
    if (!dbMatch) return [];
    return [
      {
        ...seedMatch,
        dbId: dbMatch.id,
        stage: dbMatch.stage,
        group: dbMatch.groupCode ?? undefined,
        homeTeamId: dbMatch.homeTeamId ? slugByTeamId.get(dbMatch.homeTeamId) : undefined,
        awayTeamId: dbMatch.awayTeamId ? slugByTeamId.get(dbMatch.awayTeamId) : undefined,
        homePlaceholder: dbMatch.homePlaceholder ?? undefined,
        awayPlaceholder: dbMatch.awayPlaceholder ?? undefined,
        kickoffAtUtc: dbMatch.kickoffAt.toISOString(),
        venue: dbMatch.venue,
        status: dbMatch.status,
        homeScore: dbMatch.homeScore ?? undefined,
        awayScore: dbMatch.awayScore ?? undefined,
        winnerSide:
          dbMatch.winnerSide === "home" || dbMatch.winnerSide === "away"
            ? dbMatch.winnerSide
            : undefined,
      },
    ];
  });
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
      const slug = slugByTeamId.get(row.teamId);
      if (!slug) return acc;
      acc.teams[row.stage] = [...(acc.teams[row.stage] ?? []), slug];
      if (
        row.stage === "r32" &&
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

  const events = await db
    .select({
      userId: scoreEvents.userId,
      sourceType: scoreEvents.sourceType,
      sourceId: scoreEvents.sourceId,
      reason: scoreEvents.reason,
      points: sql<number>`${scoreEvents.points}::int`,
    })
    .from(scoreEvents)
    .where(eq(scoreEvents.leagueId, league.leagueId));

  const detailBySource = await getLeaderboardDetailMap(events);

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
      details: userEvents
        .map((event) => ({
          sourceType: event.sourceType,
          reason: event.reason,
          points: event.points,
          ...(detailBySource.get(`${event.sourceType}:${event.sourceId}`) ?? {
            label: event.reason,
            detail: "Scoring event",
          }),
        }))
        .sort((a, b) => b.points - a.points || a.label.localeCompare(b.label)),
    };
  });

  return {
    league,
    rows: rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
  };
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
    teamIds.add(row.teamId);
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
    detailBySource.set(`match_prediction:${row.id}`, {
      label: `Match ${row.matchNumber}: ${home ?? row.homePlaceholder ?? "TBD"} vs ${away ?? row.awayPlaceholder ?? "TBD"}`,
      detail: `Predicted ${row.homeScore}-${row.awayScore}`,
    });
  }

  for (const row of stageRows) {
    const team = teamById.get(row.teamId);
    detailBySource.set(`stage_prediction:${row.id}`, {
      label: `${stagePredictionLabel(row.stage)}: ${team?.name ?? "Unknown team"}`,
      detail: team?.fifaCode ?? "Team pick",
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

function sortStagePredictionPicks(
  a: LeagueR32Prediction["picks"][number],
  b: LeagueR32Prediction["picks"][number],
): number {
  const teamA = seedTeams.find((team) => team.id === a.teamId);
  const teamB = seedTeams.find((team) => team.id === b.teamId);
  return (
    (teamA?.group ?? "").localeCompare(teamB?.group ?? "") ||
    a.groupRank - b.groupRank ||
    (teamA?.name ?? "").localeCompare(teamB?.name ?? "")
  );
}

function normalizeGroupRank(rank: number | null): 1 | 2 | 3 | null {
  if (rank === 1 || rank === 2 || rank === 3) return rank;
  return null;
}

const mobileStageOrder = ["r32", "r16", "qf", "sf", "final", "champion"] as const;
const mobileStageExpectedCounts = {
  r32: 32,
  r16: 16,
  qf: 8,
  sf: 4,
  final: 2,
  champion: 1,
} as const satisfies Record<(typeof mobileStageOrder)[number], number>;

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
  const knockoutLockAt = await getKnockoutStageLockAt(tournamentRow.id);
  const lockedStages = new Set(
    mobileStageOrder.filter((stage) =>
      stage === "r32"
        ? now >= tournamentRow.predictionLockAt.getTime()
        : now >= knockoutLockAt.getTime(),
    ),
  );

  const visibleStageRows = [...mobileStageOrder];

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

  const rows = await db
    .select({
      id: stagePredictions.id,
      userId: stagePredictions.userId,
      stage: stagePredictions.stage,
      teamId: stagePredictions.teamId,
      groupRank: stagePredictions.groupRank,
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
    expected: mobileStageExpectedCounts[stage],
    locked: lockedStages.has(stage),
    predictions: members.map<MobileLeagueStagePrediction>((member) => {
      const canRevealForMember = lockedStages.has(stage) || member.userId === userId;
      const stageRows = canRevealForMember
        ? (rowsByUserAndStage.get(`${member.userId}:${stage}`) ?? [])
        : [];
      const picks = stageRows.flatMap<MobileLeagueStagePick>((row) => {
        const team = teamByDbId.get(row.teamId);
        if (!team) return [];
        return [
          {
            teamId: team.slug,
            teamName: team.name,
            teamCode: team.fifaCode,
            group: team.groupCode,
            groupRank: stage === "r32" ? normalizeGroupRank(row.groupRank) : null,
          },
        ];
      });

      return {
        userId: member.userId,
        submitted: stageRows.length === mobileStageExpectedCounts[stage],
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

export async function getLeaguePredictionVisibility(userId: number, activeLeagueId?: number | null): Promise<{
  league: CurrentLeague | null;
  members: LeaguePredictionMember[];
  matches: LeaguePredictionMatch[];
  bonuses: LeagueBonusPrediction[];
  stagePredictions: LeagueR32Prediction[];
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
  const r32Revealed = now >= tournamentRow.predictionLockAt.getTime();

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

  const r32Rows = await db
    .select({
      userId: stagePredictions.userId,
      teamId: stagePredictions.teamId,
      groupRank: stagePredictions.groupRank,
    })
    .from(stagePredictions)
    .where(
      and(
        eq(stagePredictions.leagueId, league.leagueId),
        eq(stagePredictions.tournamentId, tournamentRow.id),
        eq(stagePredictions.stage, "r32"),
      ),
    );

  const r32RowsByUserId = new Map<number, typeof r32Rows>();
  for (const row of r32Rows) {
    const rows = r32RowsByUserId.get(row.userId) ?? [];
    rows.push(row);
    r32RowsByUserId.set(row.userId, rows);
  }

  const stagePredictionsByMember = members.map<LeagueR32Prediction>((member) => {
    const rows = r32RowsByUserId.get(member.userId) ?? [];
    return {
      userId: member.userId,
      submitted: rows.length === 32,
      revealed: r32Revealed,
      picks: r32Revealed
        ? rows
            .flatMap((row) => {
              const slug = slugByTeamId.get(row.teamId);
              const groupRank = normalizeGroupRank(row.groupRank);
              if (!slug || !groupRank) {
                return [];
              }
              return [{ teamId: slug, groupRank }];
            })
            .sort((a, b) => sortStagePredictionPicks(a, b))
        : [],
    };
  });

  return { league, members, matches: visibleMatches, bonuses, stagePredictions: stagePredictionsByMember };
}

export function getMatchLockAtUtc(match: Pick<MatchRow, "kickoffAt">): Date {
  return new Date(match.kickoffAt.getTime() - 5 * 60 * 1000);
}

export function getPreTournamentLockAt(tournamentRow: Pick<TournamentRow, "predictionLockAt">): Date {
  return tournamentRow.predictionLockAt;
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
