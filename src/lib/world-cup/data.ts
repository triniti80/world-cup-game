export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "final";

export type Team = {
  id: string;
  name: string;
  group: string;
  code: string;
};

export type Match = {
  id: string;
  number: number;
  stage: Stage;
  group?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  kickoffAtUtc: string;
  venue: string;
  status: "scheduled" | "live" | "final";
  homeScore?: number;
  awayScore?: number;
};

export const tournament = {
  name: "FIFA World Cup 2026",
  firstMatchAtUtc: "2026-06-11T19:00:00.000Z",
  qualifierLockAtUtc: "2026-06-11T18:00:00.000Z",
};

export const teams: Team[] = [
  { id: "canada", name: "Canada", group: "A", code: "CAN" },
  { id: "mexico", name: "Mexico", group: "A", code: "MEX" },
  { id: "south-africa", name: "South Africa", group: "A", code: "RSA" },
  { id: "qatar", name: "Qatar", group: "A", code: "QAT" },
  { id: "usa", name: "United States", group: "B", code: "USA" },
  { id: "brazil", name: "Brazil", group: "B", code: "BRA" },
  { id: "japan", name: "Japan", group: "B", code: "JPN" },
  { id: "morocco", name: "Morocco", group: "B", code: "MAR" },
  { id: "argentina", name: "Argentina", group: "C", code: "ARG" },
  { id: "france", name: "France", group: "C", code: "FRA" },
  { id: "senegal", name: "Senegal", group: "C", code: "SEN" },
  { id: "australia", name: "Australia", group: "C", code: "AUS" },
];

export const matches: Match[] = [
  {
    id: "m1",
    number: 1,
    stage: "group",
    group: "A",
    homeTeamId: "mexico",
    awayTeamId: "south-africa",
    kickoffAtUtc: "2026-06-11T19:00:00.000Z",
    venue: "Estadio Azteca, Mexico City",
    status: "scheduled",
  },
  {
    id: "m2",
    number: 2,
    stage: "group",
    group: "A",
    homeTeamId: "canada",
    awayTeamId: "qatar",
    kickoffAtUtc: "2026-06-12T00:00:00.000Z",
    venue: "BMO Field, Toronto",
    status: "scheduled",
  },
  {
    id: "m3",
    number: 3,
    stage: "group",
    group: "B",
    homeTeamId: "usa",
    awayTeamId: "japan",
    kickoffAtUtc: "2026-06-12T19:00:00.000Z",
    venue: "SoFi Stadium, Los Angeles",
    status: "scheduled",
  },
  {
    id: "m4",
    number: 4,
    stage: "group",
    group: "B",
    homeTeamId: "brazil",
    awayTeamId: "morocco",
    kickoffAtUtc: "2026-06-12T22:00:00.000Z",
    venue: "Lumen Field, Seattle",
    status: "scheduled",
  },
  {
    id: "m5",
    number: 5,
    stage: "group",
    group: "C",
    homeTeamId: "argentina",
    awayTeamId: "australia",
    kickoffAtUtc: "2026-06-13T18:00:00.000Z",
    venue: "MetLife Stadium, New York/New Jersey",
    status: "scheduled",
  },
  {
    id: "m6",
    number: 6,
    stage: "group",
    group: "C",
    homeTeamId: "france",
    awayTeamId: "senegal",
    kickoffAtUtc: "2026-06-13T21:00:00.000Z",
    venue: "AT&T Stadium, Dallas",
    status: "scheduled",
  },
  {
    id: "r32-1",
    number: 73,
    stage: "r32",
    homePlaceholder: "Winner Group A",
    awayPlaceholder: "Best third-place team",
    kickoffAtUtc: "2026-06-28T18:00:00.000Z",
    venue: "Knockout venue TBD",
    status: "scheduled",
  },
  {
    id: "r32-2",
    number: 74,
    stage: "r32",
    homePlaceholder: "Runner-up Group B",
    awayPlaceholder: "Runner-up Group C",
    kickoffAtUtc: "2026-06-28T21:00:00.000Z",
    venue: "Knockout venue TBD",
    status: "scheduled",
  },
];

export const leaderboard = [
  { id: "avi", name: "Avi", total: 0, exactScores: 0, results: 0, stage: 0 },
  { id: "maya", name: "Maya", total: 0, exactScores: 0, results: 0, stage: 0 },
  { id: "dan", name: "Dan", total: 0, exactScores: 0, results: 0, stage: 0 },
];

export function getTeam(teamId: string | undefined): Team | undefined {
  if (!teamId) return undefined;
  return teams.find((team) => team.id === teamId);
}

export function getMatchName(match: Match): string {
  const home = getTeam(match.homeTeamId)?.name ?? match.homePlaceholder ?? "TBD";
  const away = getTeam(match.awayTeamId)?.name ?? match.awayPlaceholder ?? "TBD";
  return `${home} vs ${away}`;
}

export function getMatchLockAt(match: Match): Date {
  return new Date(new Date(match.kickoffAtUtc).getTime() - 5 * 60 * 1000);
}

export function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function stageLabel(stage: Stage): string {
  switch (stage) {
    case "group":
      return "Group stage";
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
  }
}
