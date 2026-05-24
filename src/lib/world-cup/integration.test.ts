import assert from "node:assert/strict";
import test from "node:test";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client";
import {
  bonusPredictions,
  leagueMembers,
  leagues,
  matchPredictions,
  matches,
  officialBonusResults,
  officialStageResults,
  scoreEvents,
  stagePredictions,
  teams,
  tournaments,
  users,
} from "../../db/schema";
import { getLeaderboardRows, getUserProfileSummary } from "./repository";
import {
  recalculateBonusScoreEvents,
  recalculateMatchById,
  recalculateStageScoreEvents,
  scoreMatchPrediction,
} from "./scoring";

const shouldRunIntegration = process.env.RUN_DB_INTEGRATION === "1" && Boolean(process.env.DATABASE_URL);
const integrationTest = shouldRunIntegration ? test : test.skip;

type CreatedUser = typeof users.$inferSelect;
type CreatedTeam = typeof teams.$inferSelect;
type CreatedMatch = typeof matches.$inferSelect;

integrationTest("random league predictions, scores, and official results produce consistent leaderboards", async () => {
  const runId = `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const random = createSeededRandom(20260524);
  const created = {
    tournamentId: null as number | null,
    leagueIds: [] as number[],
    userIds: [] as number[],
  };

  try {
    const [tournament] = await db
      .insert(tournaments)
      .values({
        name: `Integration Cup ${runId}`,
        year: 7000 + Math.floor(random() * 100000),
        firstMatchAt: new Date("2099-06-11T20:00:00.000Z"),
        predictionLockAt: new Date("2099-06-11T19:00:00.000Z"),
      })
      .returning();
    assert.ok(tournament);
    created.tournamentId = tournament.id;

    const createdUsers = await db
      .insert(users)
      .values(
        Array.from({ length: 5 }, (_, index) => ({
          name: `Integration Player ${index + 1}`,
          email: `integration-${runId}-${index + 1}@example.test`,
          passwordHash: "integration-test-password-hash",
          role: index === 0 ? ("admin" as const) : ("user" as const),
        })),
      )
      .returning();
    assert.equal(createdUsers.length, 5);
    created.userIds = createdUsers.map((user) => user.id);

    const createdTeams = await db
      .insert(teams)
      .values(
        ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"].map(
          (name, index) => ({
            tournamentId: tournament.id,
            slug: `${runId}-team-${index + 1}`,
            fifaCode: `T${index + 1}`,
            name,
            groupCode: index < 4 ? "A" : "B",
          }),
        ),
      )
      .returning();
    assert.equal(createdTeams.length, 8);

    const createdMatches = await db
      .insert(matches)
      .values([
        matchValue(tournament.id, 1, createdTeams[0]!, createdTeams[1]!, 2, 1),
        matchValue(tournament.id, 2, createdTeams[2]!, createdTeams[3]!, 1, 1),
        matchValue(tournament.id, 3, createdTeams[4]!, createdTeams[5]!, 0, 3),
        matchValue(tournament.id, 4, createdTeams[6]!, createdTeams[7]!, 2, 2),
      ])
      .returning();
    assert.equal(createdMatches.length, 4);

    const [matchLeague, stageLeague] = await db
      .insert(leagues)
      .values([
        {
          name: `Integration Scores ${runId}`,
          inviteCode: `IMS${runId}`.slice(0, 24),
          gameMode: "match_scores" as const,
          createdByUserId: createdUsers[0]!.id,
        },
        {
          name: `Integration Stages ${runId}`,
          inviteCode: `IST${runId}`.slice(0, 24),
          gameMode: "stage_predictions" as const,
          createdByUserId: createdUsers[0]!.id,
        },
      ])
      .returning();
    assert.ok(matchLeague);
    assert.ok(stageLeague);
    created.leagueIds = [matchLeague.id, stageLeague.id];

    await db.insert(leagueMembers).values(
      createdUsers.flatMap((user) => [
        { leagueId: matchLeague.id, userId: user.id, displayName: user.name },
        { leagueId: stageLeague.id, userId: user.id, displayName: user.name },
      ]),
    );

    await insertRandomMatchPredictions(createdUsers, matchLeague.id, createdMatches, random);
    await insertRandomStagePredictions(createdUsers, stageLeague.id, tournament.id, createdTeams, random);
    await insertRandomBonusPredictions(createdUsers, matchLeague.id, stageLeague.id, tournament.id, createdTeams, random);
    await insertOfficialResults(tournament.id, createdTeams);

    for (const match of createdMatches) {
      await recalculateMatchById(match.id);
    }
    await recalculateStageScoreEvents(tournament.id);
    await recalculateBonusScoreEvents(tournament.id);

    const matchRows = await getLeaderboardRows(createdUsers[0]!.id, matchLeague.id);
    const stageRows = await getLeaderboardRows(createdUsers[0]!.id, stageLeague.id);

    assert.equal(matchRows.league?.leagueId, matchLeague.id);
    assert.equal(stageRows.league?.leagueId, stageLeague.id);
    assert.equal(matchRows.rows.length, createdUsers.length);
    assert.equal(stageRows.rows.length, createdUsers.length);

    await assertLeaderboardMatchesScoreEvents(matchLeague.id, matchRows.rows);
    await assertLeaderboardMatchesScoreEvents(stageLeague.id, stageRows.rows);
    assertSortedByTotalThenName(matchRows.rows);
    assertSortedByTotalThenName(stageRows.rows);

    for (const row of matchRows.rows) {
      assert.equal(row.stages, 0);
      assert.equal(row.total, row.exactScores + row.results + row.bonuses);
    }
    for (const row of stageRows.rows) {
      assert.equal(row.exactScores, 0);
      assert.equal(row.results, 0);
      assert.equal(row.total, row.stages + row.bonuses);
    }

    const expectedMatchScores = await expectedMatchScoreTotals(matchLeague.id, createdMatches);
    for (const row of matchRows.rows) {
      assert.equal(row.exactScores + row.results, expectedMatchScores.get(row.userId) ?? 0);
    }

    const profile = await getUserProfileSummary(createdUsers[0]!.id);
    assert.ok(profile);
    const profileLeagues = new Map(profile.leagues.map((league) => [league.leagueId, league]));
    assert.equal(profileLeagues.get(matchLeague.id)?.rank, rankOf(matchRows.rows, createdUsers[0]!.id));
    assert.equal(profileLeagues.get(stageLeague.id)?.rank, rankOf(stageRows.rows, createdUsers[0]!.id));
    assert.equal(profileLeagues.get(matchLeague.id)?.total, matchRows.rows.find((row) => row.userId === createdUsers[0]!.id)?.total);
    assert.equal(profileLeagues.get(stageLeague.id)?.total, stageRows.rows.find((row) => row.userId === createdUsers[0]!.id)?.total);
  } finally {
    await cleanup(created);
  }
});

function matchValue(
  tournamentId: number,
  matchNumber: number,
  homeTeam: CreatedTeam,
  awayTeam: CreatedTeam,
  homeScore: number,
  awayScore: number,
) {
  return {
    tournamentId,
    matchNumber,
    stage: matchNumber === 4 ? ("final" as const) : ("group" as const),
    groupCode: matchNumber === 4 ? null : homeTeam.groupCode,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    kickoffAt: new Date(`2099-06-${10 + matchNumber}T20:00:00.000Z`),
    venue: `Integration Venue ${matchNumber}`,
    status: "final" as const,
    homeScore,
    awayScore,
    winnerTeamId: homeScore === awayScore ? homeTeam.id : homeScore > awayScore ? homeTeam.id : awayTeam.id,
    winnerSide: homeScore === awayScore ? "home" : homeScore > awayScore ? "home" : "away",
  };
}

async function insertRandomMatchPredictions(
  createdUsers: CreatedUser[],
  leagueId: number,
  createdMatches: CreatedMatch[],
  random: () => number,
) {
  await db.insert(matchPredictions).values(
    createdUsers.flatMap((user, userIndex) =>
      createdMatches.map((match, matchIndex) => {
        const makeExact = (userIndex + matchIndex) % 5 === 0;
        const makeCorrectOutcome = (userIndex + matchIndex) % 3 === 0;
        const [homeScore, awayScore] = makeExact
          ? [match.homeScore!, match.awayScore!]
          : makeCorrectOutcome
            ? sameOutcomeScore(match.homeScore!, match.awayScore!, random)
            : randomScore(random);

        return {
          userId: user.id,
          leagueId,
          matchId: match.id,
          homeScore,
          awayScore,
          predictedWinnerSide: homeScore === awayScore ? "home" : homeScore > awayScore ? "home" : "away",
        };
      }),
    ),
  );
}

async function insertRandomStagePredictions(
  createdUsers: CreatedUser[],
  leagueId: number,
  tournamentId: number,
  createdTeams: CreatedTeam[],
  random: () => number,
) {
  const stages = [
    { stage: "r32" as const, count: 6 },
    { stage: "r16" as const, count: 5 },
    { stage: "qf" as const, count: 4 },
    { stage: "sf" as const, count: 3 },
    { stage: "final" as const, count: 2 },
    { stage: "champion" as const, count: 1 },
  ];

  await db.insert(stagePredictions).values(
    createdUsers.flatMap((user) =>
      stages.flatMap(({ stage, count }) =>
        shuffle(createdTeams, random)
          .slice(0, count)
          .map((team, index) => ({
            userId: user.id,
            leagueId,
            tournamentId,
            stage,
            teamId: team.id,
            groupRank: stage === "r32" ? ((index % 3) + 1) : null,
            source: "manual" as const,
          })),
      ),
    ),
  );
}

async function insertRandomBonusPredictions(
  createdUsers: CreatedUser[],
  matchLeagueId: number,
  stageLeagueId: number,
  tournamentId: number,
  createdTeams: CreatedTeam[],
  random: () => number,
) {
  const scorerNames = ["Ada Striker", "Ben Finisher", "Chen Goal"];
  await db.insert(bonusPredictions).values(
    createdUsers.flatMap((user) => {
      const topScorer = scorerNames[Math.floor(random() * scorerNames.length)]!;
      const tournamentWinner = createdTeams[Math.floor(random() * createdTeams.length)]!;
      return [
        {
          userId: user.id,
          leagueId: matchLeagueId,
          tournamentId,
          type: "top_scorer" as const,
          playerName: topScorer,
        },
        {
          userId: user.id,
          leagueId: matchLeagueId,
          tournamentId,
          type: "tournament_winner" as const,
          teamId: tournamentWinner.id,
        },
        {
          userId: user.id,
          leagueId: stageLeagueId,
          tournamentId,
          type: "top_scorer" as const,
          playerName: topScorer,
        },
      ];
    }),
  );
}

async function insertOfficialResults(tournamentId: number, createdTeams: CreatedTeam[]) {
  const officialStageTeams = {
    r32: createdTeams.slice(0, 6),
    r16: createdTeams.slice(0, 5),
    qf: createdTeams.slice(0, 4),
    sf: createdTeams.slice(0, 3),
    final: createdTeams.slice(0, 2),
    champion: createdTeams.slice(0, 1),
  } as const;

  await db.insert(officialStageResults).values(
    Object.entries(officialStageTeams).flatMap(([stage, stageTeams]) =>
      stageTeams.map((team) => ({
        tournamentId,
        stage: stage as keyof typeof officialStageTeams,
        teamId: team.id,
      })),
    ),
  );

  await db.insert(officialBonusResults).values([
    {
      tournamentId,
      type: "top_scorer" as const,
      playerName: "Ada Striker",
    },
    {
      tournamentId,
      type: "tournament_winner" as const,
      teamId: createdTeams[0]!.id,
    },
  ]);
}

async function assertLeaderboardMatchesScoreEvents(
  leagueId: number,
  rows: {
    userId: number;
    total: number;
    exactScores: number;
    results: number;
    stages: number;
    bonuses: number;
    details: { points: number }[];
  }[],
) {
  const events = await db
    .select({
      userId: scoreEvents.userId,
      sourceType: scoreEvents.sourceType,
      reason: scoreEvents.reason,
      points: sql<number>`${scoreEvents.points}::int`,
    })
    .from(scoreEvents)
    .where(eq(scoreEvents.leagueId, leagueId));

  for (const row of rows) {
    const userEvents = events.filter((event) => event.userId === row.userId);
    const exactScores = sumPoints(userEvents, (event) => event.sourceType === "match_prediction" && event.reason === "Exact score");
    const results = sumPoints(userEvents, (event) => event.sourceType === "match_prediction" && event.reason === "Correct outcome");
    const stages = sumPoints(userEvents, (event) => event.sourceType === "stage_prediction");
    const bonuses = sumPoints(userEvents, (event) => event.sourceType === "bonus_prediction");

    assert.equal(row.exactScores, exactScores);
    assert.equal(row.results, results);
    assert.equal(row.stages, stages);
    assert.equal(row.bonuses, bonuses);
    assert.equal(row.total, exactScores + results + stages + bonuses);
    assert.equal(row.details.reduce((sum, detail) => sum + detail.points, 0), row.total);
  }
}

async function expectedMatchScoreTotals(leagueId: number, createdMatches: CreatedMatch[]) {
  const predictions = await db
    .select({
      userId: matchPredictions.userId,
      matchId: matchPredictions.matchId,
      homeScore: matchPredictions.homeScore,
      awayScore: matchPredictions.awayScore,
    })
    .from(matchPredictions)
    .where(eq(matchPredictions.leagueId, leagueId));
  const matchById = new Map(createdMatches.map((match) => [match.id, match]));
  const totals = new Map<number, number>();

  for (const prediction of predictions) {
    const match = matchById.get(prediction.matchId);
    assert.ok(match);
    const score = scoreMatchPrediction({
      realHomeScore: match.homeScore!,
      realAwayScore: match.awayScore!,
      predictedHomeScore: prediction.homeScore,
      predictedAwayScore: prediction.awayScore,
    }).points;
    totals.set(prediction.userId, (totals.get(prediction.userId) ?? 0) + score);
  }

  return totals;
}

function assertSortedByTotalThenName(rows: { name: string; total: number }[]) {
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]!;
    const current = rows[index]!;
    assert.ok(
      previous.total > current.total ||
        (previous.total === current.total && previous.name.localeCompare(current.name) <= 0),
      `${previous.name} (${previous.total}) should rank before ${current.name} (${current.total})`,
    );
  }
}

function rankOf(rows: { userId: number }[], userId: number): number {
  return rows.findIndex((row) => row.userId === userId) + 1;
}

function sumPoints<T extends { points: number }>(events: T[], predicate: (event: T) => boolean): number {
  return events.filter(predicate).reduce((sum, event) => sum + event.points, 0);
}

function randomScore(random: () => number): [number, number] {
  return [Math.floor(random() * 5), Math.floor(random() * 5)];
}

function sameOutcomeScore(realHomeScore: number, realAwayScore: number, random: () => number): [number, number] {
  if (realHomeScore > realAwayScore) return [2 + Math.floor(random() * 3), Math.floor(random() * 2)];
  if (realAwayScore > realHomeScore) return [Math.floor(random() * 2), 2 + Math.floor(random() * 3)];
  return [1, 1];
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

async function cleanup(created: { tournamentId: number | null; leagueIds: number[]; userIds: number[] }) {
  if (created.leagueIds.length > 0) {
    await db.delete(leagues).where(inArray(leagues.id, created.leagueIds));
  }
  if (created.userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, created.userIds));
  }
  if (created.tournamentId) {
    await db.delete(tournaments).where(eq(tournaments.id, created.tournamentId));
  }
}
