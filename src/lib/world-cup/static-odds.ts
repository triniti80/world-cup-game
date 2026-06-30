import { matches } from "./data";

export type OutcomeSide = "home" | "draw" | "away";

export type MatchOutcomeOdds = {
  home: number;
  draw: number;
  away: number;
};

export const BASE_OUTCOME_POINTS = 2;
export const BASE_EXACT_SCORE_POINTS = 5;
export const ODDS_EXACT_SCORE_BONUS = 4;
export const ODDS_SCORING_MIN_POINTS = 1.5;
export const ODDS_SCORING_MAX_POINTS = 15;

// Static decimal odds snapshot for score prediction scoring.
// Replace these values with the chosen bookmaker snapshot before recalculating.
export const STATIC_GROUP_STAGE_ODDS: Record<number, MatchOutcomeOdds> = {
  1: { home: 1.64, draw: 5.30, away: 7.35 }, // MEX vs RSA
  2: { home: 2.24, draw: 4.57, away: 3.70 }, // KOR vs CZE
  3: { home: 2.24, draw: 4.57, away: 3.70 }, // CAN vs BIH
  4: { home: 1.95, draw: 4.82, away: 4.67 }, // USA vs PAR
  5: { home: 5.09, draw: 4.91, away: 1.87 }, // QAT vs SUI
  6: { home: 1.74, draw: 5.10, away: 6.08 }, // BRA vs MAR
  7: { home: 2.85, draw: 4.28, away: 2.85 }, // CIV vs ECU
  8: { home: 6.68, draw: 5.19, away: 1.69 }, // HAI vs SCO
  9: { home: 1.87, draw: 4.91, away: 5.09 }, // SWE vs TUN
  10: { home: 3.03, draw: 4.35, away: 2.67 }, // AUS vs TUR
  11: { home: 1.31, draw: 6.60, away: 49.19 }, // GER vs CUW
  12: { home: 1.87, draw: 4.91, away: 5.09 }, // NED vs JPN
  13: { home: 1.33, draw: 6.60, away: 34.21 }, // ESP vs CPV
  14: { home: 1.80, draw: 5.00, away: 5.55 }, // BEL vs EGY
  15: { home: 8.11, draw: 5.40, away: 1.60 }, // KSA vs URU
  16: { home: 1.46, draw: 5.88, away: 12.26 }, // IRN vs NZL
  17: { home: 1.44, draw: 6.01, away: 13.65 }, // ARG vs ALG
  18: { home: 1.49, draw: 5.75, away: 11.03 }, // AUT vs JOR
  19: { home: 1.34, draw: 6.60, away: 26.92 }, // POR vs COD
  20: { home: 1.56, draw: 5.52, away: 8.97 }, // FRA vs SEN
  21: { home: 1.80, draw: 5.00, away: 5.55 }, // ENG vs CRO
  22: { home: 8.11, draw: 5.40, away: 1.60 }, // IRQ vs NOR
  23: { home: 1.87, draw: 4.91, away: 5.09 }, // GHA vs PAN
  24: { home: 6.68, draw: 5.19, away: 1.69 }, // UZB vs COL
  25: { home: 1.87, draw: 4.91, away: 5.09 }, // CZE vs RSA
  26: { home: 1.74, draw: 5.10, away: 6.08 }, // SUI vs BIH
  27: { home: 2.04, draw: 4.73, away: 4.31 }, // CAN vs QAT
  28: { home: 2.24, draw: 4.57, away: 3.70 }, // MEX vs KOR
  29: { home: 2.04, draw: 4.73, away: 4.31 }, // USA vs AUS
  30: { home: 4.31, draw: 4.73, away: 2.04 }, // SCO vs MAR
  31: { home: 1.39, draw: 6.29, away: 16.99 }, // ECU vs CUW
  32: { home: 1.30, draw: 6.60, away: 62.80 }, // BRA vs HAI
  33: { home: 2.04, draw: 4.73, away: 4.31 }, // TUR vs PAR
  34: { home: 1.64, draw: 5.30, away: 7.35 }, // NED vs SWE
  35: { home: 1.60, draw: 5.40, away: 8.11 }, // GER vs CIV
  36: { home: 5.09, draw: 4.91, away: 1.87 }, // TUN vs JPN
  37: { home: 8.97, draw: 5.52, away: 1.56 }, // NZL vs EGY
  38: { home: 1.35, draw: 6.60, away: 23.91 }, // ESP vs KSA
  39: { home: 1.74, draw: 5.10, away: 6.08 }, // BEL vs IRN
  40: { home: 1.39, draw: 6.29, away: 16.99 }, // URU vs CPV
  41: { home: 1.52, draw: 5.63, away: 9.93 }, // ARG vs AUT
  42: { home: 1.32, draw: 6.60, away: 38.59 }, // FRA vs IRQ
  43: { home: 8.11, draw: 5.40, away: 1.60 }, // PAN vs CRO
  44: { home: 2.24, draw: 4.57, away: 3.70 }, // NOR vs SEN
  45: { home: 1.46, draw: 5.88, away: 12.26 }, // COL vs COD
  46: { home: 1.36, draw: 6.60, away: 21.25 }, // POR vs UZB
  47: { home: 1.44, draw: 6.01, away: 13.65 }, // ENG vs GHA
  48: { home: 5.55, draw: 5.00, away: 1.80 }, // JOR vs ALG
  49: { home: 1.87, draw: 4.91, away: 5.09 }, // SUI vs CAN
  50: { home: 2.24, draw: 4.57, away: 3.70 }, // BIH vs QAT
  51: { home: 8.97, draw: 5.52, away: 1.56 }, // SCO vs BRA
  52: { home: 1.35, draw: 6.60, away: 23.91 }, // MAR vs HAI
  53: { home: 2.04, draw: 4.73, away: 4.31 }, // JPN vs SWE
  54: { home: 8.97, draw: 5.52, away: 1.56 }, // TUN vs NED
  55: { home: 3.22, draw: 4.42, away: 2.51 }, // CZE vs MEX
  56: { home: 4.31, draw: 4.73, away: 2.04 }, // RSA vs KOR
  57: { home: 2.67, draw: 4.35, away: 3.03 }, // TUR vs USA
  58: { home: 2.67, draw: 4.35, away: 3.03 }, // PAR vs AUS
  59: { home: 4.67, draw: 4.82, away: 1.95 }, // ECU vs GER
  60: { home: 8.97, draw: 5.52, away: 1.56 }, // CUW vs CIV
  61: { home: 3.03, draw: 4.35, away: 2.67 }, // CPV vs KSA
  62: { home: 3.70, draw: 4.57, away: 2.24 }, // URU vs ESP
  63: { home: 2.37, draw: 4.50, away: 3.45 }, // EGY vs IRN
  64: { home: 18.99, draw: 6.45, away: 1.38 }, // NZL vs BEL
  65: { home: 5.09, draw: 4.91, away: 1.87 }, // NOR vs FRA
  66: { home: 1.52, draw: 5.63, away: 9.93 }, // SEN vs IRQ
  67: { home: 3.99, draw: 4.65, away: 2.13 }, // COL vs POR
  68: { home: 2.85, draw: 4.28, away: 2.85 }, // COD vs UZB
  69: { home: 3.03, draw: 4.35, away: 2.67 }, // ALG vs AUT
  70: { home: 30.34, draw: 6.60, away: 1.33 }, // JOR vs ARG
  71: { home: 16.99, draw: 6.29, away: 1.39 }, // PAN vs ENG
  72: { home: 1.69, draw: 5.19, away: 6.68 }, // CRO vs GHA
};

export const STATIC_KNOCKOUT_ODDS: Record<number, MatchOutcomeOdds> = {
  73: { home: 4.31, draw: 4.73, away: 2.04 }, // RSA vs CAN
  74: { home: 1.46, draw: 5.88, away: 12.26 }, // GER vs PAR
  75: { home: 2.04, draw: 4.73, away: 4.31 }, // NED vs MAR
  76: { home: 1.52, draw: 5.63, away: 9.93 }, // BRA vs JPN
  77: { home: 1.64, draw: 5.30, away: 7.35 }, // FRA vs SWE
  78: { home: 4.67, draw: 4.82, away: 1.95 }, // CIV vs NOR
  79: { home: 2.51, draw: 4.42, away: 3.22 }, // MEX vs ECU
  80: { home: 1.34, draw: 6.60, away: 26.92 }, // ENG vs COD
  81: { home: 1.95, draw: 4.82, away: 4.67 }, // USA vs BIH
  82: { home: 1.87, draw: 4.91, away: 5.09 }, // BEL vs SEN
  83: { home: 1.87, draw: 4.91, away: 5.09 }, // POR vs CRO
  84: { home: 1.52, draw: 5.63, away: 9.93 }, // ESP vs AUT
  85: { home: 2.04, draw: 4.73, away: 4.31 }, // SUI vs ALG
  86: { home: 1.33, draw: 6.60, away: 30.34 }, // ARG vs CPV
  87: { home: 1.64, draw: 5.30, away: 7.35 }, // COL vs GHA
  88: { home: 4.31, draw: 4.73, away: 2.04 }, // AUS vs EGY
};

export const STATIC_MATCH_ODDS: Record<number, MatchOutcomeOdds> = {
  ...STATIC_GROUP_STAGE_ODDS,
  ...STATIC_KNOCKOUT_ODDS,
};

const groupMatchdayByNumber = new Map<number, 1 | 2 | 3>(
  [...new Set(matches.flatMap((match) => (match.stage === "group" && match.group ? [match.group] : [])))]
    .flatMap((group) =>
      matches
        .filter((match) => match.stage === "group" && match.group === group)
        .sort((a, b) => new Date(a.kickoffAtUtc).getTime() - new Date(b.kickoffAtUtc).getTime())
        .map((match, index) => [match.number, Math.floor(index / 2) + 1 as 1 | 2 | 3] as const),
    ),
);

export function getGroupMatchday(matchNumber: number | undefined | null): 1 | 2 | 3 | null {
  return matchNumber ? groupMatchdayByNumber.get(matchNumber) ?? null : null;
}

export function getStaticMatchOdds(matchNumber: number | undefined | null): MatchOutcomeOdds | null {
  return matchNumber ? STATIC_MATCH_ODDS[matchNumber] ?? null : null;
}

export function isOddsScoredGroupMatch(matchNumber: number | undefined | null): boolean {
  const matchday = getGroupMatchday(matchNumber);
  return matchday === 2 || matchday === 3;
}

export function isOddsScoredMatch(matchNumber: number | undefined | null): boolean {
  if (!matchNumber) return false;
  return isOddsScoredGroupMatch(matchNumber) || STATIC_KNOCKOUT_ODDS[matchNumber] !== undefined;
}

export function getCorrectOutcomePoints(
  matchNumber: number | undefined | null,
  side: OutcomeSide,
): number {
  if (!isOddsScoredMatch(matchNumber)) return BASE_OUTCOME_POINTS;
  const odds = getStaticMatchOdds(matchNumber)?.[side];
  if (!odds) return BASE_OUTCOME_POINTS;
  return Math.min(
    Math.max(roundToHalfPoint(odds), ODDS_SCORING_MIN_POINTS),
    ODDS_SCORING_MAX_POINTS,
  );
}

export function getExactScorePoints(
  matchNumber: number | undefined | null,
  side: OutcomeSide,
): number {
  if (!isOddsScoredMatch(matchNumber)) return BASE_EXACT_SCORE_POINTS;
  return getCorrectOutcomePoints(matchNumber, side) + ODDS_EXACT_SCORE_BONUS;
}

function roundToHalfPoint(value: number): number {
  return Math.round(value * 2) / 2;
}
