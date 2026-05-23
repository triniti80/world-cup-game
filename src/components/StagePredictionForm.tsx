"use client";

import { useMemo, useState } from "react";
import { teams, type Team } from "@/lib/world-cup/data";
import type { SavedStagePredictions } from "@/lib/world-cup/repository";

const groups = Array.from(new Set(teams.map((team) => team.group))).sort();
const teamsByGroup = groups.map((group) => ({
  group,
  teams: teams.filter((team) => team.group === group),
}));

const knockoutStages = [
  { id: "r16", label: "Round of 16", previousLabel: "Round of 32", expected: 16 },
  { id: "qf", label: "Quarter-finals", previousLabel: "Round of 16", expected: 8 },
  { id: "sf", label: "Semi-finals", previousLabel: "Quarter-finals", expected: 4 },
  { id: "final", label: "Final", previousLabel: "Semi-finals", expected: 2 },
  { id: "champion", label: "Champion", previousLabel: "Final", expected: 1 },
] as const;

type StageId = "r32" | (typeof knockoutStages)[number]["id"];
type Rank = 1 | 2 | 3;
type Pair = {
  label: string;
  home?: Team;
  away?: Team;
};

export function StagePredictionForm({
  initialPredictions,
}: {
  initialPredictions: SavedStagePredictions;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>(initialPredictions.teams);
  const [r32Ranks, setR32Ranks] = useState<Record<string, Rank>>(initialPredictions.r32Ranks);
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedStage, setSavedStage] = useState<string | null>(null);

  const r32Pairs = useMemo(() => buildRoundOf32Pairs(r32Ranks), [r32Ranks]);
  const r16Pairs = useMemo(() => buildPairsFromTeamIds(selected.r16 ?? [], "R16"), [selected.r16]);
  const qfPairs = useMemo(() => buildPairsFromTeamIds(selected.qf ?? [], "QF"), [selected.qf]);
  const sfPairs = useMemo(() => buildPairsFromTeamIds(selected.sf ?? [], "SF"), [selected.sf]);
  const finalPairs = useMemo(
    () => buildPairsFromTeamIds(selected.final ?? [], "Final"),
    [selected.final],
  );

  const pairMap = {
    r16: r32Pairs,
    qf: r16Pairs,
    sf: qfPairs,
    final: sfPairs,
    champion: finalPairs,
  } satisfies Record<(typeof knockoutStages)[number]["id"], Pair[]>;

  function setRank(team: Team, rank: Rank) {
    setErrors((current) => ({ ...current, r32: "" }));
    setSavedStage(null);
    setR32Ranks((current) => {
      const existing = current[team.id];
      const next = { ...current };

      if (existing === rank) {
        delete next[team.id];
        setSelected((selectedCurrent) => ({
          ...selectedCurrent,
          r32: Object.keys(next),
        }));
        return next;
      }

      if (rank === 3) {
        const currentThirdCount = Object.entries(next).filter(
          ([teamId, teamRank]) => teamId !== team.id && teamRank === 3,
        ).length;
        if (currentThirdCount >= 8) {
          setErrors((errorCurrent) => ({
            ...errorCurrent,
            r32: "Only 8 third-place teams can qualify to the Round of 32.",
          }));
          return current;
        }
      }

      for (const groupTeam of teams.filter((candidate) => candidate.group === team.group)) {
        if (next[groupTeam.id] === rank) delete next[groupTeam.id];
      }

      next[team.id] = rank;
      setSelected((selectedCurrent) => ({
        ...selectedCurrent,
        r32: Object.keys(next),
      }));
      return next;
    });
  }

  function setPairWinner(stage: Exclude<StageId, "r32">, pairIndex: number, teamId: string) {
    setErrors((current) => ({ ...current, [stage]: "" }));
    setSavedStage(null);
    setSelected((current) => {
      const nextStage = [...(current[stage] ?? [])];
      nextStage[pairIndex] = nextStage[pairIndex] === teamId ? "" : teamId;
      return { ...current, [stage]: nextStage };
    });
  }

  async function saveStage(stage: StageId) {
    setSaving(stage);
    setSavedStage(null);
    setErrors((current) => ({ ...current, [stage]: "" }));
    const teamIds =
      stage === "r32"
        ? Object.entries(r32Ranks)
            .sort((a, b) => sortByGroupAndRank(a, b))
            .map(([teamId]) => teamId)
        : (selected[stage] ?? []).filter(Boolean);

    try {
      const res = await fetch("/api/predictions/stages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stage,
          teamIds,
          r32Ranks: stage === "r32" ? r32Ranks : undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors((current) => ({
          ...current,
          [stage]: body?.error ?? `Server responded ${res.status}.`,
        }));
        return;
      }
      setSavedStage(stage);
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [stage]: err instanceof Error ? err.message : "Network error.",
      }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Round of 32</h2>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Pick 1st and 2nd from every group, then choose only 8 third-place qualifiers.
            </p>
          </div>
          <span className="rounded-full bg-[var(--color-panel-high)] px-3 py-1 text-xs font-bold">
            {Object.keys(r32Ranks).length} selected · {thirdPlaceCount(r32Ranks)}/8 thirds
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {teamsByGroup.map(({ group, teams: groupTeams }) => (
            <div key={group} className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
              <h3 className="font-display text-base font-bold">Group {group}</h3>
              <div className="mt-3 space-y-2">
                {groupTeams.map((team) => (
                  <div
                    key={team.id}
                    className="grid gap-2 rounded-lg border border-white/10 bg-[var(--color-panel-high)] p-3 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <span className="font-bold">{team.code}</span>
                      <span className="ml-2 text-sm text-[var(--color-fg)]">{team.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[1, 2, 3].map((rank) => {
                        const active = r32Ranks[team.id] === rank;
                        return (
                          <button
                            key={rank}
                            type="button"
                            onClick={() => setRank(team, rank as Rank)}
                            className={
                              "rounded-md px-3 py-1.5 text-xs font-bold transition active:scale-95 " +
                              (active
                                ? "bg-[var(--color-accent)] text-[#102000]"
                                : "bg-[var(--color-panel-highest)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")
                            }
                          >
                            {rankOrdinal(rank as Rank)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <StageFooter
          stage="r32"
          saving={saving}
          savedStage={savedStage}
          error={errors.r32}
          onSave={() => void saveStage("r32")}
        />
      </section>

      {knockoutStages.map((stage) => (
        <KnockoutStage
          key={stage.id}
          stage={stage.id}
          label={stage.label}
          previousLabel={stage.previousLabel}
          expected={stage.expected}
          pairs={pairMap[stage.id]}
          selectedTeamIds={selected[stage.id] ?? []}
          saving={saving}
          savedStage={savedStage}
          error={errors[stage.id]}
          onPick={setPairWinner}
          onSave={() => void saveStage(stage.id)}
        />
      ))}
    </div>
  );
}

function KnockoutStage({
  stage,
  label,
  previousLabel,
  expected,
  pairs,
  selectedTeamIds,
  saving,
  savedStage,
  error,
  onPick,
  onSave,
}: {
  stage: Exclude<StageId, "r32">;
  label: string;
  previousLabel: string;
  expected: number;
  pairs: Pair[];
  selectedTeamIds: string[];
  saving: string | null;
  savedStage: string | null;
  error?: string;
  onPick: (stage: Exclude<StageId, "r32">, pairIndex: number, teamId: string) => void;
  onSave: () => void;
}) {
  const pickedCount = selectedTeamIds.filter(Boolean).length;

  return (
    <section className="glass-card rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{label}</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Choose winners from your {previousLabel} matchups.
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-panel-high)] px-3 py-1 text-xs font-bold">
          {pickedCount}/{expected} selected
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {pairs.length > 0 ? (
          pairs.map((pair, index) => (
            <div key={`${stage}-${pair.label}`} className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-3">
              <div className="mb-2 text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                {pair.label}
              </div>
              <PairTeamButton
                team={pair.home}
                active={Boolean(pair.home && selectedTeamIds[index] === pair.home.id)}
                onClick={() => pair.home && onPick(stage, index, pair.home.id)}
              />
              <div className="my-2 text-center text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                vs
              </div>
              <PairTeamButton
                team={pair.away}
                active={Boolean(pair.away && selectedTeamIds[index] === pair.away.id)}
                onClick={() => pair.away && onPick(stage, index, pair.away.id)}
              />
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)] md:col-span-2">
            Select teams in the previous round first.
          </div>
        )}
      </div>

      <StageFooter
        stage={stage}
        saving={saving}
        savedStage={savedStage}
        error={error}
        onSave={onSave}
      />
    </section>
  );
}

function PairTeamButton({
  team,
  active,
  onClick,
}: {
  team?: Team;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!team}
      onClick={onClick}
      className={
        "w-full rounded-lg border px-3 py-2 text-left text-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 " +
        (active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          : "border-white/10 bg-[var(--color-panel-high)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")
      }
    >
      {team ? (
        <>
          <span className="font-bold">{team.code}</span>
          <span className="ml-2">{team.name}</span>
        </>
      ) : (
        "Waiting for qualifier"
      )}
    </button>
  );
}

function StageFooter({
  stage,
  saving,
  savedStage,
  error,
  onSave,
}: {
  stage: StageId;
  saving: string | null;
  savedStage: string | null;
  error?: string;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
      <div className="text-sm">
        {error ? (
          <span className="font-semibold text-[var(--color-danger)]">{error}</span>
        ) : savedStage === stage ? (
          <span className="font-semibold text-[var(--color-accent)]">Saved</span>
        ) : (
          <span className="text-[var(--color-fg-muted)]">Locks 1 hour before Match 1</span>
        )}
      </div>
      <button
        type="button"
        disabled={saving !== null}
        onClick={onSave}
        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[#102000] disabled:opacity-60"
      >
        {saving === stage ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function buildRoundOf32Pairs(ranks: Record<string, Rank>): Pair[] {
  const winners = groups.map((group) => teamByRank(group, 1, ranks));
  const runners = groups.map((group) => teamByRank(group, 2, ranks));
  const thirds = groups.map((group) => teamByRank(group, 3, ranks)).filter(Boolean);
  const pairs: Pair[] = [];

  for (let index = 0; index < 8; index += 1) {
    pairs.push({
      label: `R32 Match ${index + 1}`,
      home: winners[index],
      away: thirds[index],
    });
  }

  for (let index = 8; index < winners.length; index += 1) {
    pairs.push({
      label: `R32 Match ${pairs.length + 1}`,
      home: winners[index],
      away: runners[index - 8],
    });
  }

  for (let index = 4; index < runners.length; index += 2) {
    pairs.push({
      label: `R32 Match ${pairs.length + 1}`,
      home: runners[index],
      away: runners[index + 1],
    });
  }

  return pairs;
}

function buildPairsFromTeamIds(teamIds: string[], prefix: string): Pair[] {
  const filledTeamIds = teamIds.filter(Boolean);
  const pairs: Pair[] = [];
  for (let index = 0; index < filledTeamIds.length; index += 2) {
    pairs.push({
      label: `${prefix} Match ${pairs.length + 1}`,
      home: getTeamById(filledTeamIds[index]),
      away: getTeamById(filledTeamIds[index + 1]),
    });
  }
  return pairs;
}

function teamByRank(group: string, rank: Rank, ranks: Record<string, Rank>): Team | undefined {
  return teams.find((team) => team.group === group && ranks[team.id] === rank);
}

function getTeamById(teamId: string | undefined): Team | undefined {
  if (!teamId) return undefined;
  return teams.find((team) => team.id === teamId);
}

function thirdPlaceCount(ranks: Record<string, Rank>): number {
  return Object.values(ranks).filter((rank) => rank === 3).length;
}

function rankOrdinal(rank: Rank): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  return "3rd";
}

function sortByGroupAndRank(a: [string, Rank], b: [string, Rank]): number {
  const teamA = getTeamById(a[0]);
  const teamB = getTeamById(b[0]);
  return (
    (teamA?.group ?? "").localeCompare(teamB?.group ?? "") ||
    a[1] - b[1] ||
    (teamA?.name ?? "").localeCompare(teamB?.name ?? "")
  );
}
