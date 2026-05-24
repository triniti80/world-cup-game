import { formatDateTime, t, teamNamesHe, type Locale } from "@/lib/i18n";

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

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
  firstMatchAtUtc: "2026-06-11T20:00:00.000Z",
  qualifierLockAtUtc: "2026-06-11T19:00:00.000Z",
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

const fixtureTeamIds: Record<string, string> = {
  Mexico: "mexico",
  "South Africa": "south-africa",
  "South Korea": "korea-republic",
  Czechia: "czechia",
  Canada: "canada",
  "Bosnia & Herzegovina": "bosnia-herzegovina",
  Qatar: "qatar",
  Switzerland: "switzerland",
  Brazil: "brazil",
  Morocco: "morocco",
  Haiti: "haiti",
  Scotland: "scotland",
  "United States": "usa",
  Paraguay: "paraguay",
  Australia: "australia",
  Turkiye: "turkiye",
  Germany: "germany",
  Curacao: "curacao",
  "Ivory Coast": "cote-divoire",
  Ecuador: "ecuador",
  Netherlands: "netherlands",
  Japan: "japan",
  Tunisia: "tunisia",
  Sweden: "sweden",
  Belgium: "belgium",
  Egypt: "egypt",
  Iran: "iran",
  "New Zealand": "new-zealand",
  Spain: "spain",
  "Cape Verde": "cabo-verde",
  "Saudi Arabia": "saudi-arabia",
  Uruguay: "uruguay",
  France: "france",
  Senegal: "senegal",
  Norway: "norway",
  Iraq: "iraq",
  Argentina: "argentina",
  Algeria: "algeria",
  Austria: "austria",
  Jordan: "jordan",
  Portugal: "portugal",
  Uzbekistan: "uzbekistan",
  Colombia: "colombia",
  "DR Congo": "dr-congo",
  England: "england",
  Croatia: "croatia",
  Ghana: "ghana",
  Panama: "panama",
};

type FixtureRow = readonly [
  number: number,
  stage: Stage,
  group: string | null,
  home: string,
  away: string,
  kickoffAtUtc: string,
  venue: string,
];

const fixtureRows: FixtureRow[] = [
  [1, "group", "A", "Mexico", "South Africa", "2026-06-11T20:00:00.000Z", "Estadio Banorte"],
  [2, "group", "A", "South Korea", "Czechia", "2026-06-12T03:00:00.000Z", "Estadio Akron"],
  [3, "group", "B", "Canada", "Bosnia & Herzegovina", "2026-06-12T20:00:00.000Z", "BMO Field"],
  [4, "group", "D", "United States", "Paraguay", "2026-06-13T02:00:00.000Z", "SoFi Stadium"],
  [5, "group", "B", "Qatar", "Switzerland", "2026-06-13T20:00:00.000Z", "Levi's Stadium"],
  [6, "group", "C", "Brazil", "Morocco", "2026-06-13T23:00:00.000Z", "MetLife Stadium"],
  [7, "group", "E", "Ivory Coast", "Ecuador", "2026-06-14T00:00:00.000Z", "Lincoln Financial Field"],
  [8, "group", "C", "Haiti", "Scotland", "2026-06-14T02:00:00.000Z", "Gillette Stadium"],
  [9, "group", "F", "Sweden", "Tunisia", "2026-06-14T03:00:00.000Z", "Estadio BBVA"],
  [10, "group", "D", "Australia", "Turkiye", "2026-06-14T05:00:00.000Z", "BC Place"],
  [11, "group", "E", "Germany", "Curacao", "2026-06-14T18:00:00.000Z", "NRG Stadium"],
  [12, "group", "F", "Netherlands", "Japan", "2026-06-14T21:00:00.000Z", "AT&T Stadium"],
  [13, "group", "H", "Spain", "Cape Verde", "2026-06-15T17:00:00.000Z", "Mercedes-Benz Stadium"],
  [14, "group", "G", "Belgium", "Egypt", "2026-06-15T20:00:00.000Z", "Lumen Field"],
  [15, "group", "H", "Saudi Arabia", "Uruguay", "2026-06-15T23:00:00.000Z", "Hard Rock Stadium"],
  [16, "group", "G", "Iran", "New Zealand", "2026-06-16T02:00:00.000Z", "SoFi Stadium"],
  [17, "group", "J", "Argentina", "Algeria", "2026-06-16T02:00:00.000Z", "GEHA Field at Arrowhead Stadium"],
  [18, "group", "J", "Austria", "Jordan", "2026-06-16T05:00:00.000Z", "Levi's Stadium"],
  [19, "group", "K", "Portugal", "DR Congo", "2026-06-16T18:00:00.000Z", "NRG Stadium"],
  [20, "group", "I", "France", "Senegal", "2026-06-16T20:00:00.000Z", "MetLife Stadium"],
  [21, "group", "L", "England", "Croatia", "2026-06-16T21:00:00.000Z", "AT&T Stadium"],
  [22, "group", "I", "Iraq", "Norway", "2026-06-16T23:00:00.000Z", "Gillette Stadium"],
  [23, "group", "L", "Ghana", "Panama", "2026-06-17T00:00:00.000Z", "BMO Field"],
  [24, "group", "K", "Uzbekistan", "Colombia", "2026-06-17T03:00:00.000Z", "Estadio Banorte"],
  [25, "group", "A", "Czechia", "South Africa", "2026-06-18T17:00:00.000Z", "Mercedes-Benz Stadium"],
  [26, "group", "B", "Switzerland", "Bosnia & Herzegovina", "2026-06-18T20:00:00.000Z", "SoFi Stadium"],
  [27, "group", "B", "Canada", "Qatar", "2026-06-18T23:00:00.000Z", "BC Place"],
  [28, "group", "A", "Mexico", "South Korea", "2026-06-19T02:00:00.000Z", "Estadio Akron"],
  [29, "group", "D", "United States", "Australia", "2026-06-19T20:00:00.000Z", "Lumen Field"],
  [30, "group", "C", "Scotland", "Morocco", "2026-06-19T23:00:00.000Z", "Gillette Stadium"],
  [31, "group", "E", "Ecuador", "Curacao", "2026-06-20T01:00:00.000Z", "GEHA Field at Arrowhead Stadium"],
  [32, "group", "C", "Brazil", "Haiti", "2026-06-20T02:00:00.000Z", "Lincoln Financial Field"],
  [33, "group", "D", "Turkiye", "Paraguay", "2026-06-20T02:00:00.000Z", "Levi's Stadium"],
  [34, "group", "F", "Netherlands", "Sweden", "2026-06-20T18:00:00.000Z", "NRG Stadium"],
  [35, "group", "E", "Germany", "Ivory Coast", "2026-06-20T21:00:00.000Z", "BMO Field"],
  [36, "group", "F", "Tunisia", "Japan", "2026-06-21T02:00:00.000Z", "Estadio BBVA"],
  [37, "group", "G", "New Zealand", "Egypt", "2026-06-21T02:00:00.000Z", "BC Place"],
  [38, "group", "H", "Spain", "Saudi Arabia", "2026-06-21T17:00:00.000Z", "Mercedes-Benz Stadium"],
  [39, "group", "G", "Belgium", "Iran", "2026-06-21T20:00:00.000Z", "SoFi Stadium"],
  [40, "group", "H", "Uruguay", "Cape Verde", "2026-06-21T23:00:00.000Z", "Hard Rock Stadium"],
  [41, "group", "J", "Argentina", "Austria", "2026-06-22T18:00:00.000Z", "AT&T Stadium"],
  [42, "group", "I", "France", "Iraq", "2026-06-22T22:00:00.000Z", "Lincoln Financial Field"],
  [43, "group", "L", "Panama", "Croatia", "2026-06-23T00:00:00.000Z", "BMO Field"],
  [44, "group", "I", "Norway", "Senegal", "2026-06-23T01:00:00.000Z", "MetLife Stadium"],
  [45, "group", "K", "Colombia", "DR Congo", "2026-06-23T03:00:00.000Z", "Estadio Akron"],
  [46, "group", "K", "Portugal", "Uzbekistan", "2026-06-23T18:00:00.000Z", "NRG Stadium"],
  [47, "group", "L", "England", "Ghana", "2026-06-23T21:00:00.000Z", "Gillette Stadium"],
  [48, "group", "J", "Jordan", "Algeria", "2026-06-24T00:00:00.000Z", "Levi's Stadium"],
  [49, "group", "B", "Switzerland", "Canada", "2026-06-24T20:00:00.000Z", "BC Place"],
  [50, "group", "B", "Bosnia & Herzegovina", "Qatar", "2026-06-24T20:00:00.000Z", "Lumen Field"],
  [51, "group", "C", "Scotland", "Brazil", "2026-06-24T23:00:00.000Z", "Hard Rock Stadium"],
  [52, "group", "C", "Morocco", "Haiti", "2026-06-24T23:00:00.000Z", "Mercedes-Benz Stadium"],
  [53, "group", "F", "Japan", "Sweden", "2026-06-25T00:00:00.000Z", "AT&T Stadium"],
  [54, "group", "F", "Tunisia", "Netherlands", "2026-06-25T00:00:00.000Z", "GEHA Field at Arrowhead Stadium"],
  [55, "group", "A", "Czechia", "Mexico", "2026-06-25T02:00:00.000Z", "Estadio Banorte"],
  [56, "group", "A", "South Africa", "South Korea", "2026-06-25T02:00:00.000Z", "Estadio BBVA"],
  [57, "group", "D", "Turkiye", "United States", "2026-06-25T03:00:00.000Z", "SoFi Stadium"],
  [58, "group", "D", "Paraguay", "Australia", "2026-06-25T03:00:00.000Z", "Levi's Stadium"],
  [59, "group", "E", "Ecuador", "Germany", "2026-06-25T21:00:00.000Z", "MetLife Stadium"],
  [60, "group", "E", "Curacao", "Ivory Coast", "2026-06-25T21:00:00.000Z", "Lincoln Financial Field"],
  [61, "group", "H", "Cape Verde", "Saudi Arabia", "2026-06-26T01:00:00.000Z", "NRG Stadium"],
  [62, "group", "H", "Uruguay", "Spain", "2026-06-26T01:00:00.000Z", "Estadio Akron"],
  [63, "group", "G", "Egypt", "Iran", "2026-06-26T04:00:00.000Z", "Lumen Field"],
  [64, "group", "G", "New Zealand", "Belgium", "2026-06-26T04:00:00.000Z", "BC Place"],
  [65, "group", "I", "Norway", "France", "2026-06-26T20:00:00.000Z", "Gillette Stadium"],
  [66, "group", "I", "Senegal", "Iraq", "2026-06-26T20:00:00.000Z", "BMO Field"],
  [67, "group", "K", "Colombia", "Portugal", "2026-06-27T00:30:00.000Z", "Hard Rock Stadium"],
  [68, "group", "K", "DR Congo", "Uzbekistan", "2026-06-27T00:30:00.000Z", "Mercedes-Benz Stadium"],
  [69, "group", "J", "Algeria", "Austria", "2026-06-27T03:00:00.000Z", "GEHA Field at Arrowhead Stadium"],
  [70, "group", "J", "Jordan", "Argentina", "2026-06-27T03:00:00.000Z", "AT&T Stadium"],
  [71, "group", "L", "Panama", "England", "2026-06-27T22:00:00.000Z", "MetLife Stadium"],
  [72, "group", "L", "Croatia", "Ghana", "2026-06-27T22:00:00.000Z", "Lincoln Financial Field"],
  [73, "r32", null, "2A", "2B", "2026-06-28T19:00:00.000Z", "SoFi Stadium"],
  [74, "r32", null, "1C", "2F", "2026-06-29T17:00:00.000Z", "NRG Stadium"],
  [75, "r32", null, "1E", "3A/C/D/F", "2026-06-29T20:30:00.000Z", "Gillette Stadium"],
  [76, "r32", null, "1F", "2C", "2026-06-30T00:00:00.000Z", "Estadio BBVA"],
  [77, "r32", null, "1A", "3C/E/F/H/I", "2026-06-30T01:00:00.000Z", "Estadio Banorte"],
  [78, "r32", null, "2E", "2I", "2026-06-30T17:00:00.000Z", "AT&T Stadium"],
  [79, "r32", null, "1I", "3C/D/F/G/H", "2026-06-30T21:00:00.000Z", "MetLife Stadium"],
  [80, "r32", null, "1D", "3B/E/F/I/J", "2026-07-01T00:00:00.000Z", "Levi's Stadium"],
  [81, "r32", null, "1L", "3E/H/I/J/K", "2026-07-01T16:00:00.000Z", "Mercedes-Benz Stadium"],
  [82, "r32", null, "1G", "3A/E/H/I/J", "2026-07-01T20:00:00.000Z", "Lumen Field"],
  [83, "r32", null, "1H", "2J", "2026-07-02T19:00:00.000Z", "SoFi Stadium"],
  [84, "r32", null, "2K", "2L", "2026-07-02T23:00:00.000Z", "BMO Field"],
  [85, "r32", null, "1B", "3E/F/G/I/J", "2026-07-03T03:00:00.000Z", "BC Place"],
  [86, "r32", null, "2D", "2G", "2026-07-03T18:00:00.000Z", "AT&T Stadium"],
  [87, "r32", null, "1J", "2H", "2026-07-03T22:00:00.000Z", "Hard Rock Stadium"],
  [88, "r32", null, "1K", "3D/E/I/J/L", "2026-07-04T01:30:00.000Z", "GEHA Field at Arrowhead Stadium"],
  [89, "r16", null, "W73", "W76", "2026-07-04T19:00:00.000Z", "NRG Stadium"],
  [90, "r16", null, "W74", "W78", "2026-07-04T23:00:00.000Z", "SoFi Stadium"],
  [91, "r16", null, "W75", "W77", "2026-07-05T01:00:00.000Z", "MetLife Stadium"],
  [92, "r16", null, "W79", "W81", "2026-07-05T22:00:00.000Z", "Lincoln Financial Field"],
  [93, "r16", null, "W80", "W82", "2026-07-06T01:00:00.000Z", "Lumen Field"],
  [94, "r16", null, "W83", "W84", "2026-07-06T21:00:00.000Z", "AT&T Stadium"],
  [95, "r16", null, "W85", "W88", "2026-07-07T01:00:00.000Z", "Mercedes-Benz Stadium"],
  [96, "r16", null, "W86", "W87", "2026-07-08T01:00:00.000Z", "Gillette Stadium"],
  [97, "qf", null, "W89", "W90", "2026-07-09T22:00:00.000Z", "Gillette Stadium"],
  [98, "qf", null, "W91", "W92", "2026-07-10T23:00:00.000Z", "SoFi Stadium"],
  [99, "qf", null, "W93", "W94", "2026-07-11T20:00:00.000Z", "Hard Rock Stadium"],
  [100, "qf", null, "W95", "W96", "2026-07-12T01:00:00.000Z", "GEHA Field at Arrowhead Stadium"],
  [101, "sf", null, "W97", "W98", "2026-07-15T00:00:00.000Z", "AT&T Stadium"],
  [102, "sf", null, "W99", "W100", "2026-07-16T00:00:00.000Z", "Mercedes-Benz Stadium"],
  [103, "third", null, "L101", "L102", "2026-07-18T20:00:00.000Z", "Hard Rock Stadium"],
  [104, "final", null, "W101", "W102", "2026-07-19T20:00:00.000Z", "MetLife Stadium"],
];

export const matches: Match[] = fixtureRows.map(
  ([number, stage, group, home, away, kickoffAtUtc, venue]) => ({
    id: `m${number}`,
    number,
    stage,
    group: group ?? undefined,
    homeTeamId: fixtureTeamIds[home],
    awayTeamId: fixtureTeamIds[away],
    homePlaceholder: fixtureTeamIds[home] ? undefined : home,
    awayPlaceholder: fixtureTeamIds[away] ? undefined : away,
    kickoffAtUtc,
    venue,
    status: "scheduled",
  }),
);

export const leaderboard = [
  { id: "avi", name: "Avi", total: 0, exactScores: 0, results: 0, stage: 0 },
  { id: "maya", name: "Maya", total: 0, exactScores: 0, results: 0, stage: 0 },
  { id: "dan", name: "Dan", total: 0, exactScores: 0, results: 0, stage: 0 },
];

export function getTeam(teamId: string | undefined): Team | undefined {
  if (!teamId) return undefined;
  return teams.find((team) => team.id === teamId);
}

export function getTeamName(team: Team | undefined, locale: Locale = "en"): string | undefined {
  if (!team) return undefined;
  return locale === "he" ? teamNamesHe[team.id] ?? team.name : team.name;
}

export function getMatchName(match: Match, locale: Locale = "en"): string {
  const home = getTeamName(getTeam(match.homeTeamId), locale) ?? match.homePlaceholder ?? t(locale, "common.tbd");
  const away = getTeamName(getTeam(match.awayTeamId), locale) ?? match.awayPlaceholder ?? t(locale, "common.tbd");
  return `${home} ${t(locale, "common.vs")} ${away}`;
}

export function getMatchLockAt(match: Match): Date {
  return new Date(new Date(match.kickoffAtUtc).getTime() - 5 * 60 * 1000);
}

export function formatKickoff(iso: string, locale: Locale = "en"): string {
  return formatDateTime(iso, locale);
}

export function stageLabel(stage: Stage, locale: Locale = "en"): string {
  return t(locale, `stage.${stage}`);
}
