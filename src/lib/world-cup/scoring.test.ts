import assert from "node:assert/strict";
import test from "node:test";
import { scoreMatchPrediction } from "./scoring";

test("awards five points for an exact score", () => {
  assert.deepEqual(
    scoreMatchPrediction({
      matchNumber: 1,
      realHomeScore: 2,
      realAwayScore: 1,
      predictedHomeScore: 2,
      predictedAwayScore: 1,
    }),
    { points: 5, reason: "Exact score" },
  );
});

test("awards two points for the right outcome without exact score", () => {
  assert.deepEqual(
    scoreMatchPrediction({
      matchNumber: 1,
      realHomeScore: 3,
      realAwayScore: 1,
      predictedHomeScore: 1,
      predictedAwayScore: 0,
    }),
    { points: 2, reason: "Correct outcome" },
  );
});

test("awards two points for a predicted draw outcome", () => {
  assert.deepEqual(
    scoreMatchPrediction({
      matchNumber: 1,
      realHomeScore: 1,
      realAwayScore: 1,
      predictedHomeScore: 2,
      predictedAwayScore: 2,
    }),
    { points: 2, reason: "Correct outcome" },
  );
});

test("awards zero points for the wrong outcome", () => {
  assert.deepEqual(
    scoreMatchPrediction({
      matchNumber: 25,
      realHomeScore: 0,
      realAwayScore: 2,
      predictedHomeScore: 1,
      predictedAwayScore: 0,
    }),
    { points: 0, reason: "Wrong outcome" },
  );
});

test("uses static odds from the second group matchday", () => {
  assert.deepEqual(
    scoreMatchPrediction({
      matchNumber: 25,
      realHomeScore: 2,
      realAwayScore: 0,
      predictedHomeScore: 1,
      predictedAwayScore: 0,
    }),
    { points: 2, reason: "Correct outcome" },
  );

  assert.deepEqual(
    scoreMatchPrediction({
      matchNumber: 30,
      realHomeScore: 1,
      realAwayScore: 0,
      predictedHomeScore: 2,
      predictedAwayScore: 1,
    }),
    { points: 4.5, reason: "Correct outcome" },
  );
});

test("adds a four point exact-score bonus to odds scoring", () => {
  assert.deepEqual(
    scoreMatchPrediction({
      matchNumber: 30,
      realHomeScore: 1,
      realAwayScore: 0,
      predictedHomeScore: 1,
      predictedAwayScore: 0,
    }),
    { points: 8.5, reason: "Exact score" },
  );
});

test("uses a one and a half point minimum for static odds scoring", () => {
  assert.deepEqual(
    scoreMatchPrediction({
      matchNumber: 32,
      realHomeScore: 1,
      realAwayScore: 0,
      predictedHomeScore: 2,
      predictedAwayScore: 0,
    }),
    { points: 1.5, reason: "Correct outcome" },
  );
});

test("caps static odds outcome points at fifteen", () => {
  assert.deepEqual(
    scoreMatchPrediction({
      matchNumber: 32,
      realHomeScore: 0,
      realAwayScore: 1,
      predictedHomeScore: 0,
      predictedAwayScore: 2,
    }),
    { points: 15, reason: "Correct outcome" },
  );

  assert.deepEqual(
    scoreMatchPrediction({
      matchNumber: 32,
      realHomeScore: 0,
      realAwayScore: 1,
      predictedHomeScore: 0,
      predictedAwayScore: 1,
    }),
    { points: 19, reason: "Exact score" },
  );
});
