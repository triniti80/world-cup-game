export type StandingTeam<TId extends string | number = string | number> = {
  id: TId;
  group?: string | null;
  name?: string | null;
};

export type StandingMatch<TId extends string | number = string | number> = {
  stage: string;
  group?: string | null;
  homeTeamId?: TId | null;
  awayTeamId?: TId | null;
  status: "scheduled" | "live" | "final";
  homeScore?: number | null;
  awayScore?: number | null;
};

type TeamStats<TId extends string | number> = {
  team: StandingTeam<TId>;
  played: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  wins: number;
};

export function getCompletedGroupTopTwoRanks<TId extends string | number>(
  teams: readonly StandingTeam<TId>[],
  matches: readonly StandingMatch<TId>[],
): Map<TId, 1 | 2> {
  const ranks = new Map<TId, 1 | 2>();
  for (const table of getCompletedGroupTables(teams, matches)) {
    if (table[0]) ranks.set(table[0].team.id, 1);
    if (table[1]) ranks.set(table[1].team.id, 2);
  }

  return ranks;
}

export function getCompletedGroupQualifierRanks<TId extends string | number>(
  teams: readonly StandingTeam<TId>[],
  matches: readonly StandingMatch<TId>[],
): Map<TId, 1 | 2 | 3> {
  const groups = [...new Set(teams.flatMap((team) => (team.group ? [team.group] : [])))].sort();
  const completedTables = getCompletedGroupTables(teams, matches);
  const ranks = new Map<TId, 1 | 2 | 3>();

  for (const table of completedTables) {
    if (table[0]) ranks.set(table[0].team.id, 1);
    if (table[1]) ranks.set(table[1].team.id, 2);
  }

  if (completedTables.length !== groups.length) {
    return ranks;
  }

  const qualifiedThirds = completedTables
    .flatMap((table) => (table[2] ? [table[2]] : []))
    .sort(compareTeamStats)
    .slice(0, 8);

  for (const thirdPlaceTeam of qualifiedThirds) {
    ranks.set(thirdPlaceTeam.team.id, 3);
  }

  return ranks;
}

function getCompletedGroupTables<TId extends string | number>(
  teams: readonly StandingTeam<TId>[],
  matches: readonly StandingMatch<TId>[],
): TeamStats<TId>[][] {
  const tables: TeamStats<TId>[][] = [];
  const groups = [...new Set(teams.flatMap((team) => (team.group ? [team.group] : [])))].sort();

  for (const group of groups) {
    const groupTeams = teams.filter((team) => team.group === group);
    const groupMatches = matches.filter((match) => match.stage === "group" && match.group === group);
    const expectedMatches = (groupTeams.length * (groupTeams.length - 1)) / 2;
    if (
      groupTeams.length < 2 ||
      groupMatches.length < expectedMatches ||
      groupMatches.some(
        (match) =>
          match.status !== "final" ||
          match.homeScore === undefined ||
          match.homeScore === null ||
          match.awayScore === undefined ||
          match.awayScore === null ||
          match.homeTeamId === undefined ||
          match.homeTeamId === null ||
          match.awayTeamId === undefined ||
          match.awayTeamId === null,
      )
    ) {
      continue;
    }

    const table = groupTeams.map<TeamStats<TId>>((team) => ({
      team,
      played: 0,
      points: 0,
      goalDifference: 0,
      goalsFor: 0,
      wins: 0,
    }));
    const statsByTeamId = new Map(table.map((row) => [row.team.id, row]));

    for (const match of groupMatches) {
      const home = statsByTeamId.get(match.homeTeamId!);
      const away = statsByTeamId.get(match.awayTeamId!);
      if (!home || !away) continue;

      home.played += 1;
      away.played += 1;
      home.goalsFor += match.homeScore!;
      away.goalsFor += match.awayScore!;
      home.goalDifference += match.homeScore! - match.awayScore!;
      away.goalDifference += match.awayScore! - match.homeScore!;

      if (match.homeScore! > match.awayScore!) {
        home.points += 3;
        home.wins += 1;
      } else if (match.awayScore! > match.homeScore!) {
        away.points += 3;
        away.wins += 1;
      } else {
        home.points += 1;
        away.points += 1;
      }
    }

    table.sort(compareTeamStats);
    tables.push(table);
  }

  return tables;
}

function compareTeamStats<TId extends string | number>(
  a: TeamStats<TId>,
  b: TeamStats<TId>,
): number {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    b.wins - a.wins ||
    (a.team.name ?? String(a.team.id)).localeCompare(b.team.name ?? String(b.team.id))
  );
}
