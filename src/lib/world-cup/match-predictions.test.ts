import assert from "node:assert/strict";
import test from "node:test";
import { resolvePredictedWinnerSide } from "./match-predictions";

test("infers a winner side from a non-draw score", () => {
  assert.deepEqual(
    resolvePredictedWinnerSide({
      stage: "r32",
      homeScore: 3,
      awayScore: 1,
    }),
    { ok: true, side: "home" },
  );
});

test("allows group-stage draws without an advancing side", () => {
  assert.deepEqual(
    resolvePredictedWinnerSide({
      stage: "group",
      homeScore: 1,
      awayScore: 1,
    }),
    { ok: true, side: null },
  );
});

test("requires an advancing side for tied knockout predictions", () => {
  assert.deepEqual(
    resolvePredictedWinnerSide({
      stage: "qf",
      homeScore: 2,
      awayScore: 2,
    }),
    { ok: false, error: "Choose who advances for a tied knockout prediction." },
  );
});

test("accepts an advancing side for tied knockout predictions", () => {
  assert.deepEqual(
    resolvePredictedWinnerSide({
      stage: "final",
      homeScore: 0,
      awayScore: 0,
      selectedSide: "away",
    }),
    { ok: true, side: "away" },
  );
});
