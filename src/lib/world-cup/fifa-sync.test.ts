import assert from "node:assert/strict";
import test from "node:test";
import { fetchFifaCalendarMatches, parseFifaCalendarMatches } from "./fifa-sync";

test("parses final FIFA calendar results by match number", () => {
  const [match] = parseFifaCalendarMatches({
    Results: [
      {
        MatchNumber: 7,
        MatchStatus: 0,
        HomeTeamScore: 2,
        AwayTeamScore: 1,
        Winner: "home-team",
        Home: { IdTeam: "home-team", Abbreviation: "QAT" },
        Away: { IdTeam: "away-team", IdCountry: "SUI" },
      },
    ],
  });

  assert.deepEqual(match, {
    matchNumber: 7,
    homeTeamCode: "QAT",
    awayTeamCode: "SUI",
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
    homeTeamCode: null,
    awayTeamCode: null,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    winnerSide: null,
  });
});

test("retries temporary FIFA fetch failures", async () => {
  let attempts = 0;
  const matches = await fetchFifaCalendarMatches((async () => {
    attempts += 1;
    if (attempts === 1) {
      return new Response("Temporary error", { status: 503 });
    }

    return Response.json({
      Results: [
        {
          MatchNumber: 2,
          MatchStatus: 1,
          Home: { Abbreviation: "MEX" },
          Away: { Abbreviation: "RSA" },
        },
      ],
    });
  }) as typeof fetch);

  assert.equal(attempts, 2);
  assert.equal(matches[0]?.matchNumber, 2);
});
