import assert from "node:assert/strict";
import test from "node:test";
import { scoreMatchPrediction } from "./scoring";

test("awards five points for an exact score", () => {
  assert.deepEqual(
    scoreMatchPrediction({
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
      realHomeScore: 0,
      realAwayScore: 2,
      predictedHomeScore: 1,
      predictedAwayScore: 0,
    }),
    { points: 0, reason: "Wrong outcome" },
  );
});
