import type { Stage } from "./data";

export type PredictedWinnerSide = "home" | "away";

export function isKnockoutStage(stage: Stage): boolean {
  return stage !== "group";
}

export function resolvePredictedWinnerSide(input: {
  stage: Stage;
  homeScore: number;
  awayScore: number;
  selectedSide?: PredictedWinnerSide | null;
}): { ok: true; side: PredictedWinnerSide | null } | { ok: false; error: string } {
  if (input.homeScore > input.awayScore) return { ok: true, side: "home" };
  if (input.awayScore > input.homeScore) return { ok: true, side: "away" };

  if (!isKnockoutStage(input.stage)) {
    return { ok: true, side: null };
  }

  if (input.selectedSide === "home" || input.selectedSide === "away") {
    return { ok: true, side: input.selectedSide };
  }

  return { ok: false, error: "Choose who advances for a tied knockout prediction." };
}
