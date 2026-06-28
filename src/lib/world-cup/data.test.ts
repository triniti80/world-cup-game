import assert from "node:assert/strict";
import test from "node:test";
import { matches, stageLabel, teams } from "./data";

test("imports the full 104-match tournament schedule", () => {
  assert.equal(matches.length, 104);
  assert.equal(matches[0]?.number, 1);
  assert.equal(matches[0]?.kickoffAtUtc, "2026-06-11T19:00:00.000Z");
  assert.equal(matches[0]?.venue, "Estadio Banorte, Mexico City");
  assert.equal(matches[103]?.number, 104);
  assert.equal(matches[103]?.stage, "final");
  assert.equal(matches[103]?.kickoffAtUtc, "2026-07-19T19:00:00.000Z");
  assert.equal(matches[103]?.venue, "MetLife Stadium, New York New Jersey");
});

test("adds host city to seeded venue names", () => {
  const losAngelesMatch = matches.find((match) => match.number === 73);
  const monterreyMatch = matches.find((match) => match.number === 75);

  assert.equal(losAngelesMatch?.venue, "SoFi Stadium, Los Angeles");
  assert.equal(monterreyMatch?.venue, "Estadio BBVA, Monterrey");
});

test("uses official kickoff times for corrected group fixtures", () => {
  const portugalCongo = matches.find((match) => match.number === 19);
  assert.equal(portugalCongo?.homeTeamId, "portugal");
  assert.equal(portugalCongo?.awayTeamId, "dr-congo");
  assert.equal(portugalCongo?.kickoffAtUtc, "2026-06-17T17:00:00.000Z");

  const uzbekistanColombia = matches.find((match) => match.number === 24);
  assert.equal(uzbekistanColombia?.homeTeamId, "uzbekistan");
  assert.equal(uzbekistanColombia?.awayTeamId, "colombia");
  assert.equal(uzbekistanColombia?.kickoffAtUtc, "2026-06-18T02:00:00.000Z");
});

test("keeps knockout fixture numbers aligned with official placeholders", () => {
  const match74 = matches.find((match) => match.number === 74);
  assert.equal(match74?.homePlaceholder, "1E");
  assert.equal(match74?.awayPlaceholder, "3A/B/C/D/F");
  assert.equal(match74?.kickoffAtUtc, "2026-06-29T20:30:00.000Z");

  const thirdPlace = matches.find((match) => match.number === 103);
  assert.equal(thirdPlace?.homePlaceholder, "RU101");
  assert.equal(thirdPlace?.awayPlaceholder, "RU102");
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
