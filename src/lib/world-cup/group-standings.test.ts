import assert from "node:assert/strict";
import test from "node:test";
import { getCompletedGroupQualifierRanks, type StandingMatch, type StandingTeam } from "./group-standings";

test("completed groups include the best eight third-place qualifiers", () => {
  const groups = "ABCDEFGHIJKL".split("");
  const teams = groups.flatMap<StandingTeam<string>>((group) =>
    [1, 2, 3, 4].map((seed) => ({
      id: `${group}${seed}`,
      group,
      name: `${group}${seed}`,
    })),
  );
  const matches = groups.flatMap<StandingMatch<string>>((group, groupIndex) => {
    const thirdWinsFinalMatch = groupIndex < 8;
    return [
      groupMatch(group, 1, 2, 1, 0),
      groupMatch(group, 1, 3, 1, 0),
      groupMatch(group, 1, 4, 1, 0),
      groupMatch(group, 2, 3, 1, 0),
      groupMatch(group, 2, 4, 1, 0),
      thirdWinsFinalMatch
        ? groupMatch(group, 3, 4, 1, 0)
        : groupMatch(group, 3, 4, 0, 0),
    ];
  });

  const ranks = getCompletedGroupQualifierRanks(teams, matches);
  const rankCounts = [...ranks.values()].reduce<Record<1 | 2 | 3, number>>(
    (acc, rank) => ({ ...acc, [rank]: acc[rank] + 1 }),
    { 1: 0, 2: 0, 3: 0 },
  );

  assert.deepEqual(rankCounts, { 1: 12, 2: 12, 3: 8 });
  for (const group of groups.slice(0, 8)) {
    assert.equal(ranks.get(`${group}3`), 3);
  }
  for (const group of groups.slice(8)) {
    assert.notEqual(ranks.get(`${group}3`), 3);
  }
});

function groupMatch(
  group: string,
  homeSeed: number,
  awaySeed: number,
  homeScore: number,
  awayScore: number,
): StandingMatch<string> {
  return {
    stage: "group",
    group,
    homeTeamId: `${group}${homeSeed}`,
    awayTeamId: `${group}${awaySeed}`,
    status: "final",
    homeScore,
    awayScore,
  };
}
