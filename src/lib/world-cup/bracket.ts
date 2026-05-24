import { THIRD_PLACE_ASSIGNMENT_ROWS } from "./third-place-matrix.generated";

export type GroupRank = 1 | 2 | 3;

export type BracketTeam = {
  id: string;
  group: string;
};

export type RoundOf32Slot = {
  label: string;
  home: { rank: GroupRank; group: string };
  away:
    | { rank: GroupRank; group: string }
    | { rank: 3; candidateGroups: readonly string[]; placeholder: string };
};

export type RoundOf32Pair<T extends BracketTeam> = {
  label: string;
  home?: T;
  away?: T;
  homePlaceholder: string;
  awayPlaceholder: string;
};

// Ordered by the official bracket path, not by kickoff time. Keeping this order
// makes each next round pair adjacent winners from the prior round.
export const ROUND_OF_32_SLOTS = [
  thirdPlaceSlot("M74", "E", "ABCDF"),
  thirdPlaceSlot("M77", "I", "CDFGH"),
  fixedSlot("M73", { rank: 2, group: "A" }, { rank: 2, group: "B" }),
  fixedSlot("M75", { rank: 1, group: "F" }, { rank: 2, group: "C" }),
  fixedSlot("M83", { rank: 2, group: "K" }, { rank: 2, group: "L" }),
  fixedSlot("M84", { rank: 1, group: "H" }, { rank: 2, group: "J" }),
  thirdPlaceSlot("M81", "D", "BEFIJ"),
  thirdPlaceSlot("M82", "G", "AEHIJ"),
  fixedSlot("M76", { rank: 1, group: "C" }, { rank: 2, group: "F" }),
  fixedSlot("M78", { rank: 2, group: "E" }, { rank: 2, group: "I" }),
  thirdPlaceSlot("M79", "A", "CEFHI"),
  thirdPlaceSlot("M80", "L", "EHIJK"),
  fixedSlot("M86", { rank: 1, group: "J" }, { rank: 2, group: "H" }),
  fixedSlot("M88", { rank: 2, group: "D" }, { rank: 2, group: "G" }),
  thirdPlaceSlot("M85", "B", "EFGIJ"),
  thirdPlaceSlot("M87", "K", "DEIJL"),
] as const satisfies readonly RoundOf32Slot[];

const THIRD_PLACE_ASSIGNMENT_LABELS = ["M79", "M85", "M81", "M74", "M82", "M77", "M87", "M80"] as const;
const THIRD_PLACE_ASSIGNMENT_BY_GROUPS = parseThirdPlaceAssignmentRows(THIRD_PLACE_ASSIGNMENT_ROWS);

export function buildRoundOf32Pairs<T extends BracketTeam>(
  teams: readonly T[],
  ranks: Record<string, GroupRank>,
): RoundOf32Pair<T>[] {
  const assignedThirds = assignThirdPlaceTeams(teams, ranks);

  return ROUND_OF_32_SLOTS.map((slot) => ({
    label: slot.label,
    home: teamByRank(teams, ranks, slot.home.group, slot.home.rank),
    away:
      "candidateGroups" in slot.away
        ? assignedThirds.get(slot.label)
        : teamByRank(teams, ranks, slot.away.group, slot.away.rank),
    homePlaceholder: `${slot.home.rank}${slot.home.group}`,
    awayPlaceholder:
      "candidateGroups" in slot.away
        ? `3${slot.away.candidateGroups.join("/")}`
        : `${slot.away.rank}${slot.away.group}`,
  }));
}

export function assignThirdPlaceTeams<T extends BracketTeam>(
  teams: readonly T[],
  ranks: Record<string, GroupRank>,
): Map<string, T> {
  const thirdPlaceTeams = teams
    .filter((team) => ranks[team.id] === 3)
    .sort((a, b) => a.group.localeCompare(b.group));
  const exactAssignment = THIRD_PLACE_ASSIGNMENT_BY_GROUPS[thirdPlaceTeams.map((team) => team.group).join("")];
  if (exactAssignment) {
    return new Map(
      Object.entries(exactAssignment)
        .map(([matchLabel, group]) => [matchLabel, thirdPlaceTeams.find((team) => team.group === group)] as const)
        .filter((entry): entry is readonly [string, T] => Boolean(entry[1])),
    );
  }

  const thirdPlaceSlots = ROUND_OF_32_SLOTS.filter((slot) => "candidateGroups" in slot.away);
  const assignment = new Map<string, T>();
  const usedTeamIds = new Set<string>();

  function backtrack(): boolean {
    if (assignment.size === thirdPlaceTeams.length || assignment.size === thirdPlaceSlots.length) {
      return true;
    }

    const nextSlot = [...thirdPlaceSlots]
      .filter((slot) => !assignment.has(slot.label))
      .map((slot) => ({
        slot,
        candidates: thirdPlaceTeams.filter(
          (team) =>
            !usedTeamIds.has(team.id) &&
            "candidateGroups" in slot.away &&
            slot.away.candidateGroups.includes(team.group),
        ),
      }))
      .sort(
        (a, b) =>
          a.candidates.length - b.candidates.length ||
          a.slot.label.localeCompare(b.slot.label),
      )[0];

    if (!nextSlot) return true;
    if (nextSlot.candidates.length === 0) return false;

    for (const team of nextSlot.candidates) {
      assignment.set(nextSlot.slot.label, team);
      usedTeamIds.add(team.id);
      if (backtrack()) return true;
      usedTeamIds.delete(team.id);
      assignment.delete(nextSlot.slot.label);
    }

    return false;
  }

  backtrack();
  return assignment;
}

function fixedSlot(
  label: string,
  home: { rank: GroupRank; group: string },
  away: { rank: GroupRank; group: string },
): RoundOf32Slot {
  return { label, home, away };
}

function thirdPlaceSlot(label: string, winnerGroup: string, candidateGroups: string): RoundOf32Slot {
  return {
    label,
    home: { rank: 1, group: winnerGroup },
    away: {
      rank: 3,
      candidateGroups: candidateGroups.split(""),
      placeholder: `3${candidateGroups}`,
    },
  };
}

function teamByRank<T extends BracketTeam>(
  teams: readonly T[],
  ranks: Record<string, GroupRank>,
  group: string,
  rank: GroupRank,
): T | undefined {
  return teams.find((team) => team.group === group && ranks[team.id] === rank);
}

function parseThirdPlaceAssignmentRows(rows: string): Record<string, Record<string, string>> {
  const assignments: Record<string, Record<string, string>> = {};

  for (const row of rows.trim().split("\n")) {
    const [groupsKey, assignedGroups] = row.split(":");
    if (!groupsKey || !assignedGroups || groupsKey.length !== 8 || assignedGroups.length !== 8) {
      throw new Error(`Invalid third-place assignment row: ${row}`);
    }

    assignments[groupsKey] = Object.fromEntries(
      [...assignedGroups].map((group, index) => [THIRD_PLACE_ASSIGNMENT_LABELS[index], group]),
    );
  }

  return assignments;
}
