import assert from "node:assert/strict";
import test from "node:test";
import { parseFifaCalendarMatches } from "./fifa-sync";

test("parses final FIFA calendar results by match number", () => {
  const [match] = parseFifaCalendarMatches({
    Results: [
      {
        MatchNumber: 7,
        MatchStatus: 0,
        HomeTeamScore: 2,
        AwayTeamScore: 1,
        Winner: "home-team",
        Home: { IdTeam: "home-team" },
        Away: { IdTeam: "away-team" },
      },
    ],
  });

  assert.deepEqual(match, {
    matchNumber: 7,
    status: "final",
    homeScore: 2,
    awayScore: 1,
    winnerSide: "home",
  });
});

test("keeps scheduled FIFA fixtures scoreless", () => {
  const [match] = parseFifaCalendarMatches({
    Results: [
      {
        MatchNumber: "1",
        MatchStatus: 1,
        HomeTeamScore: null,
        AwayTeamScore: null,
        Winner: null,
      },
    ],
  });

  assert.deepEqual(match, {
    matchNumber: 1,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    winnerSide: null,
  });
});
