import assert from "node:assert/strict";
import test from "node:test";
import { matches, stageLabel, teams } from "./data";

test("imports the full 104-match tournament schedule", () => {
  assert.equal(matches.length, 104);
  assert.equal(matches[0]?.number, 1);
  assert.equal(matches[0]?.kickoffAtUtc, "2026-06-11T20:00:00.000Z");
  assert.equal(matches[0]?.venue, "Estadio Banorte");
  assert.equal(matches[103]?.number, 104);
  assert.equal(matches[103]?.stage, "final");
  assert.equal(matches[103]?.venue, "MetLife Stadium");
});

test("keeps the expected group and knockout stage counts", () => {
  const stageCounts = matches.reduce<Record<string, number>>((counts, match) => {
    counts[match.stage] = (counts[match.stage] ?? 0) + 1;
    return counts;
  }, {});

  assert.deepEqual(stageCounts, {
    group: 72,
    r32: 16,
    r16: 8,
    qf: 4,
    sf: 2,
    third: 1,
    final: 1,
  });

  const groupCounts = matches
    .filter((match) => match.stage === "group")
    .reduce<Record<string, number>>((counts, match) => {
      assert.ok(match.group);
      counts[match.group] = (counts[match.group] ?? 0) + 1;
      return counts;
    }, {});

  assert.deepEqual(groupCounts, {
    A: 6,
    B: 6,
    C: 6,
    D: 6,
    E: 6,
    F: 6,
    G: 6,
    H: 6,
    I: 6,
    J: 6,
    K: 6,
    L: 6,
  });
});

test("all group fixtures resolve to seeded team ids", () => {
  const teamIds = new Set(teams.map((team) => team.id));

  for (const match of matches.filter((fixture) => fixture.stage === "group")) {
    assert.ok(match.homeTeamId, `match ${match.number} is missing a home team id`);
    assert.ok(match.awayTeamId, `match ${match.number} is missing an away team id`);
    assert.ok(teamIds.has(match.homeTeamId));
    assert.ok(teamIds.has(match.awayTeamId));
    assert.equal(match.homePlaceholder, undefined);
    assert.equal(match.awayPlaceholder, undefined);
  }
});

test("labels the third-place fixture stage", () => {
  assert.equal(stageLabel("third"), "Third-place match");
});
