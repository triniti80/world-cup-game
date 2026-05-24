import assert from "node:assert/strict";
import test from "node:test";
import { buildRoundOf32Pairs, ROUND_OF_32_SLOTS, type GroupRank } from "./bracket";
import { teams } from "./data";

test("round of 32 follows the official bracket slot order", () => {
  assert.deepEqual(
    ROUND_OF_32_SLOTS.map((slot) => [
      slot.label,
      `${slot.home.rank}${slot.home.group}`,
      "candidateGroups" in slot.away
        ? `3${slot.away.candidateGroups.join("")}`
        : `${slot.away.rank}${slot.away.group}`,
    ]),
    [
      ["M74", "1E", "3ABCDF"],
      ["M77", "1I", "3CDFGH"],
      ["M73", "2A", "2B"],
      ["M75", "1F", "2C"],
      ["M83", "2K", "2L"],
      ["M84", "1H", "2J"],
      ["M81", "1D", "3BEFIJ"],
      ["M82", "1G", "3AEHIJ"],
      ["M76", "1C", "2F"],
      ["M78", "2E", "2I"],
      ["M79", "1A", "3CEFHI"],
      ["M80", "1L", "3EHIJK"],
      ["M86", "1J", "2H"],
      ["M88", "2D", "2G"],
      ["M85", "1B", "3EFGIJ"],
      ["M87", "1K", "3DEIJL"],
    ],
  );
});

test("round of 32 assigns every possible set of third-place qualifiers once", () => {
  const groupCodes = [...new Set(teams.map((team) => team.group))].sort();

  for (const thirdPlaceGroups of combinations(groupCodes, 8)) {
    const ranks = buildRanks(thirdPlaceGroups);
    const pairs = buildRoundOf32Pairs(teams, ranks);
    const allTeamIds = pairs.flatMap((pair) => [pair.home?.id, pair.away?.id]).filter(Boolean);
    const thirdPlaceTeams = pairs.map((pair) => pair.away).filter((team) => team && ranks[team.id] === 3);

    assert.equal(pairs.length, 16);
    assert.equal(allTeamIds.length, 32, `all R32 slots should be filled for thirds ${thirdPlaceGroups.join("")}`);
    assert.equal(new Set(allTeamIds).size, 32, `no duplicate team for thirds ${thirdPlaceGroups.join("")}`);
    assert.deepEqual(
      new Set(thirdPlaceTeams.map((team) => team?.group)),
      new Set(thirdPlaceGroups),
      `all third-place qualifiers should be used for thirds ${thirdPlaceGroups.join("")}`,
    );

    for (const pair of pairs) {
      assert.ok(pair.home);
      assert.ok(pair.away);
      assert.notEqual(pair.home.group, pair.away.group, `${pair.label} must not repeat group ${pair.home.group}`);
      if (ranks[pair.away.id] === 3) {
        const slot = ROUND_OF_32_SLOTS.find((candidate) => candidate.label === pair.label);
        assert.ok(slot && "candidateGroups" in slot.away);
        assert.ok(slot.away.candidateGroups.includes(pair.away.group));
      }
    }
  }
});

test("round of 32 matches the FIFA predictor screenshot scenario", () => {
  const ranks = buildScreenshotRanks();
  const pairs = buildRoundOf32Pairs(teams, ranks);
  const matchupByMatch = new Map(pairs.map((pair) => [pair.label, `${pair.home?.code}-${pair.away?.code}`]));

  assert.deepEqual(Object.fromEntries(matchupByMatch), {
    M74: "GER-JPN",
    M77: "NOR-BEL",
    M73: "CZE-BIH",
    M75: "NED-BRA",
    M83: "UZB-PAN",
    M84: "KSA-ALG",
    M81: "TUR-SEN",
    M82: "IRN-KOR",
    M76: "HAI-SWE",
    M78: "CUW-IRQ",
    M79: "MEX-ECU",
    M80: "ENG-POR",
    M86: "JOR-URU",
    M88: "USA-EGY",
    M85: "QAT-ARG",
    M87: "COL-CRO",
  });
});

function buildRanks(thirdPlaceGroups: string[]): Record<string, GroupRank> {
  const ranks: Record<string, GroupRank> = {};
  for (const group of [...new Set(teams.map((team) => team.group))]) {
    const groupTeams = teams.filter((team) => team.group === group);
    ranks[groupTeams[0]!.id] = 1;
    ranks[groupTeams[1]!.id] = 2;
    if (thirdPlaceGroups.includes(group)) {
      ranks[groupTeams[2]!.id] = 3;
    }
  }
  return ranks;
}

function buildScreenshotRanks(): Record<string, GroupRank> {
  return {
    mexico: 1,
    czechia: 2,
    "korea-republic": 3,
    qatar: 1,
    "bosnia-herzegovina": 2,
    haiti: 1,
    brazil: 2,
    turkiye: 1,
    usa: 2,
    germany: 1,
    curacao: 2,
    ecuador: 3,
    netherlands: 1,
    sweden: 2,
    japan: 3,
    iran: 1,
    egypt: 2,
    belgium: 3,
    "saudi-arabia": 1,
    uruguay: 2,
    norway: 1,
    iraq: 2,
    senegal: 3,
    jordan: 1,
    algeria: 2,
    argentina: 3,
    colombia: 1,
    uzbekistan: 2,
    portugal: 3,
    england: 1,
    panama: 2,
    croatia: 3,
  };
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [
    ...combinations(rest, size - 1).map((combo) => [first!, ...combo]),
    ...combinations(rest, size),
  ];
}
