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
  { id: "mexico", name: "Mexico", group: "A", code: "MEX" },
  { id: "south-africa", name: "South Africa", group: "A", code: "RSA" },
  { id: "korea-republic", name: "Korea Republic", group: "A", code: "KOR" },
  { id: "czechia", name: "Czechia", group: "A", code: "CZE" },
  { id: "canada", name: "Canada", group: "B", code: "CAN" },
  { id: "switzerland", name: "Switzerland", group: "B", code: "SUI" },
  { id: "qatar", name: "Qatar", group: "B", code: "QAT" },
  { id: "bosnia-herzegovina", name: "Bosnia and Herzegovina", group: "B", code: "BIH" },
  { id: "brazil", name: "Brazil", group: "C", code: "BRA" },
  { id: "morocco", name: "Morocco", group: "C", code: "MAR" },
  { id: "haiti", name: "Haiti", group: "C", code: "HAI" },
  { id: "scotland", name: "Scotland", group: "C", code: "SCO" },
  { id: "usa", name: "United States", group: "D", code: "USA" },
  { id: "paraguay", name: "Paraguay", group: "D", code: "PAR" },
  { id: "australia", name: "Australia", group: "D", code: "AUS" },
  { id: "turkiye", name: "Turkiye", group: "D", code: "TUR" },
  { id: "germany", name: "Germany", group: "E", code: "GER" },
  { id: "curacao", name: "Curacao", group: "E", code: "CUW" },
  { id: "cote-divoire", name: "Cote d'Ivoire", group: "E", code: "CIV" },
  { id: "ecuador", name: "Ecuador", group: "E", code: "ECU" },
  { id: "netherlands", name: "Netherlands", group: "F", code: "NED" },
  { id: "japan", name: "Japan", group: "F", code: "JPN" },
  { id: "tunisia", name: "Tunisia", group: "F", code: "TUN" },
  { id: "sweden", name: "Sweden", group: "F", code: "SWE" },
  { id: "belgium", name: "Belgium", group: "G", code: "BEL" },
  { id: "egypt", name: "Egypt", group: "G", code: "EGY" },
  { id: "iran", name: "IR Iran", group: "G", code: "IRN" },
  { id: "new-zealand", name: "New Zealand", group: "G", code: "NZL" },
  { id: "spain", name: "Spain", group: "H", code: "ESP" },
  { id: "cabo-verde", name: "Cabo Verde", group: "H", code: "CPV" },
  { id: "saudi-arabia", name: "Saudi Arabia", group: "H", code: "KSA" },
  { id: "uruguay", name: "Uruguay", group: "H", code: "URU" },
  { id: "france", name: "France", group: "I", code: "FRA" },
  { id: "senegal", name: "Senegal", group: "I", code: "SEN" },
  { id: "norway", name: "Norway", group: "I", code: "NOR" },
  { id: "iraq", name: "Iraq", group: "I", code: "IRQ" },
  { id: "argentina", name: "Argentina", group: "J", code: "ARG" },
  { id: "algeria", name: "Algeria", group: "J", code: "ALG" },
  { id: "austria", name: "Austria", group: "J", code: "AUT" },
  { id: "jordan", name: "Jordan", group: "J", code: "JOR" },
  { id: "portugal", name: "Portugal", group: "K", code: "POR" },
  { id: "uzbekistan", name: "Uzbekistan", group: "K", code: "UZB" },
  { id: "colombia", name: "Colombia", group: "K", code: "COL" },
  { id: "dr-congo", name: "Congo DR", group: "K", code: "COD" },
  { id: "england", name: "England", group: "L", code: "ENG" },
  { id: "croatia", name: "Croatia", group: "L", code: "CRO" },
  { id: "ghana", name: "Ghana", group: "L", code: "GHA" },
  { id: "panama", name: "Panama", group: "L", code: "PAN" },
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
    venue: "Mexico City Stadium",
    status: "scheduled",
  },
  {
    id: "m2",
    number: 2,
    stage: "group",
    group: "A",
    homeTeamId: "korea-republic",
    awayTeamId: "czechia",
    kickoffAtUtc: "2026-06-12T02:00:00.000Z",
    venue: "Estadio Guadalajara",
    status: "scheduled",
  },
  {
    id: "m3",
    number: 3,
    stage: "group",
    group: "B",
    homeTeamId: "canada",
    awayTeamId: "bosnia-herzegovina",
    kickoffAtUtc: "2026-06-12T19:00:00.000Z",
    venue: "Toronto Stadium",
    status: "scheduled",
  },
  {
    id: "m4",
    number: 4,
    stage: "group",
    group: "D",
    homeTeamId: "usa",
    awayTeamId: "paraguay",
    kickoffAtUtc: "2026-06-12T22:00:00.000Z",
    venue: "Los Angeles Stadium",
    status: "scheduled",
  },
  {
    id: "m5",
    number: 5,
    stage: "group",
    group: "C",
    homeTeamId: "haiti",
    awayTeamId: "scotland",
    kickoffAtUtc: "2026-06-13T16:00:00.000Z",
    venue: "Boston Stadium",
    status: "scheduled",
  },
  {
    id: "m6",
    number: 6,
    stage: "group",
    group: "D",
    homeTeamId: "australia",
    awayTeamId: "turkiye",
    kickoffAtUtc: "2026-06-13T19:00:00.000Z",
    venue: "BC Place Vancouver",
    status: "scheduled",
  },
  {
    id: "m7",
    number: 7,
    stage: "group",
    group: "C",
    homeTeamId: "brazil",
    awayTeamId: "morocco",
    kickoffAtUtc: "2026-06-13T22:00:00.000Z",
    venue: "New York New Jersey Stadium",
    status: "scheduled",
  },
  {
    id: "m8",
    number: 8,
    stage: "group",
    group: "B",
    homeTeamId: "qatar",
    awayTeamId: "switzerland",
    kickoffAtUtc: "2026-06-14T01:00:00.000Z",
    venue: "San Francisco Bay Area Stadium",
    status: "scheduled",
  },
  {
    id: "m9",
    number: 9,
    stage: "group",
    group: "E",
    homeTeamId: "cote-divoire",
    awayTeamId: "ecuador",
    kickoffAtUtc: "2026-06-14T16:00:00.000Z",
    venue: "Philadelphia Stadium",
    status: "scheduled",
  },
  {
    id: "m10",
    number: 10,
    stage: "group",
    group: "E",
    homeTeamId: "germany",
    awayTeamId: "curacao",
    kickoffAtUtc: "2026-06-14T19:00:00.000Z",
    venue: "Houston Stadium",
    status: "scheduled",
  },
  {
    id: "m11",
    number: 11,
    stage: "group",
    group: "F",
    homeTeamId: "netherlands",
    awayTeamId: "japan",
    kickoffAtUtc: "2026-06-14T22:00:00.000Z",
    venue: "Dallas Stadium",
    status: "scheduled",
  },
  {
    id: "m12",
    number: 12,
    stage: "group",
    group: "F",
    homeTeamId: "sweden",
    awayTeamId: "tunisia",
    kickoffAtUtc: "2026-06-15T01:00:00.000Z",
    venue: "Estadio Monterrey",
    status: "scheduled",
  },
  {
    id: "m13",
    number: 13,
    stage: "group",
    group: "H",
    homeTeamId: "saudi-arabia",
    awayTeamId: "uruguay",
    kickoffAtUtc: "2026-06-15T16:00:00.000Z",
    venue: "Miami Stadium",
    status: "scheduled",
  },
  {
    id: "m14",
    number: 14,
    stage: "group",
    group: "H",
    homeTeamId: "spain",
    awayTeamId: "cabo-verde",
    kickoffAtUtc: "2026-06-15T19:00:00.000Z",
    venue: "Atlanta Stadium",
    status: "scheduled",
  },
  {
    id: "m15",
    number: 15,
    stage: "group",
    group: "G",
    homeTeamId: "iran",
    awayTeamId: "new-zealand",
    kickoffAtUtc: "2026-06-15T22:00:00.000Z",
    venue: "Los Angeles Stadium",
    status: "scheduled",
  },
  {
    id: "m16",
    number: 16,
    stage: "group",
    group: "G",
    homeTeamId: "belgium",
    awayTeamId: "egypt",
    kickoffAtUtc: "2026-06-16T01:00:00.000Z",
    venue: "Seattle Stadium",
    status: "scheduled",
  },
  {
    id: "m17",
    number: 17,
    stage: "group",
    group: "I",
    homeTeamId: "france",
    awayTeamId: "senegal",
    kickoffAtUtc: "2026-06-16T19:00:00.000Z",
    venue: "New York New Jersey Stadium",
    status: "scheduled",
  },
  {
    id: "m18",
    number: 18,
    stage: "group",
    group: "I",
    homeTeamId: "iraq",
    awayTeamId: "norway",
    kickoffAtUtc: "2026-06-16T22:00:00.000Z",
    venue: "Boston Stadium",
    status: "scheduled",
  },
  {
    id: "r32-1",
    number: 73,
    stage: "r32",
    homePlaceholder: "2A",
    awayPlaceholder: "2B",
    kickoffAtUtc: "2026-06-28T18:00:00.000Z",
    venue: "Knockout venue TBD",
    status: "scheduled",
  },
  {
    id: "r32-2",
    number: 74,
    stage: "r32",
    homePlaceholder: "1A",
    awayPlaceholder: "3C/E/F",
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
