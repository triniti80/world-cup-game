export type StagePredictionStage = "r32" | "r16" | "qf" | "sf" | "final" | "champion";

type KnockoutResultMatch<TId extends string | number = string | number> = {
  stage: string;
  status: "scheduled" | "live" | "final";
  winnerTeamId?: TId | null;
};

const nextPredictionStageByMatchStage = {
  r32: "r16",
  r16: "qf",
  qf: "sf",
  sf: "final",
  final: "champion",
} as const satisfies Record<string, StagePredictionStage>;
type KnockoutMatchStage = keyof typeof nextPredictionStageByMatchStage;

export function getCompletedKnockoutQualifierTeams<TId extends string | number>(
  matches: readonly KnockoutResultMatch<TId>[],
): Map<StagePredictionStage, Set<TId>> {
  const teamsByStage = new Map<StagePredictionStage, Set<TId>>();

  for (const match of matches) {
    if (match.status !== "final" || match.winnerTeamId === undefined || match.winnerTeamId === null) {
      continue;
    }
    const nextStage = isKnockoutMatchStage(match.stage)
      ? nextPredictionStageByMatchStage[match.stage]
      : null;
    if (!nextStage) continue;

    const teams = teamsByStage.get(nextStage) ?? new Set<TId>();
    teams.add(match.winnerTeamId);
    teamsByStage.set(nextStage, teams);
  }

  return teamsByStage;
}

function isKnockoutMatchStage(stage: string): stage is KnockoutMatchStage {
  return stage in nextPredictionStageByMatchStage;
}
