"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { Locale, TranslationKey } from "@/lib/i18n";
import {
  ROUND_OF_32_SLOTS,
  buildRoundOf32Pairs as buildOfficialRoundOf32Pairs,
} from "@/lib/world-cup/bracket";
import { getTeamName, teams, type Match, type Team } from "@/lib/world-cup/data";
import { getCompletedGroupQualifierRanks } from "@/lib/world-cup/group-standings";
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
const stageIds = ["r32", "r16", "qf", "sf", "final", "champion"] as const satisfies readonly StageId[];
const stageExpectedCounts = {
  r32: 32,
  r16: 16,
  qf: 8,
  sf: 4,
  final: 2,
  champion: 1,
} as const satisfies Record<StageId, number>;
const downstreamStagesByStage = {
  r32: ["r16", "qf", "sf", "final", "champion"],
  r16: ["qf", "sf", "final", "champion"],
  qf: ["sf", "final", "champion"],
  sf: ["final", "champion"],
  final: ["champion"],
  champion: [],
} as const satisfies Record<StageId, readonly StageId[]>;
const roundOf32BracketOrder = new Map(
  ROUND_OF_32_SLOTS.map((slot, index) => [Number(slot.label.slice(1)), index] as const),
);
type Rank = 1 | 2 | 3;
type Pair = {
  label: string;
  home?: Team;
  away?: Team;
  homeId?: string;
  awayId?: string;
  homePlaceholderKey?: string;
  awayPlaceholderKey?: string;
  homePlaceholder?: string;
  awayPlaceholder?: string;
};
type StageCompletion = {
  picked: number;
  complete: boolean;
  message: string;
};
type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export function StagePredictionForm({
  initialPredictions,
  lockedStages,
  matches = [],
}: {
  initialPredictions: SavedStagePredictions;
  lockedStages: { r32: boolean; knockout: boolean };
  matches?: Match[];
}) {
  const { locale, t } = useI18n();
  const initialRoundOf32Pairs = useMemo(() => {
    return buildBestRoundOf32Pairs(matches, initialPredictions.r32Ranks);
  }, [initialPredictions.r32Ranks, matches]);
  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    sanitizeSelectionsWithRoundOf32Pairs(initialPredictions.teams, initialRoundOf32Pairs),
  );
  const [r32Ranks, setR32Ranks] = useState<Record<string, Rank>>(initialPredictions.r32Ranks);
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedStage, setSavedStage] = useState<string | null>(null);
  const [submittedStages, setSubmittedStages] = useState<Record<StageId, boolean>>(() =>
    getSubmittedStages(initialPredictions),
  );
  const [editingStages, setEditingStages] = useState<Record<StageId, boolean>>(() =>
    Object.fromEntries(stageIds.map((stage) => [stage, false])) as Record<StageId, boolean>,
  );

  const actualRoundOf32Pairs = useMemo(() => buildRoundOf32PairsFromMatches(matches), [matches]);
  const completedGroupRoundOf32Pairs = useMemo(
    () => buildRoundOf32PairsFromCompletedGroups(matches),
    [matches],
  );
  const predictedRoundOf32Pairs = useMemo(() => buildRoundOf32Pairs(r32Ranks), [r32Ranks]);
  const r32Pairs =
    actualRoundOf32Pairs.length > 0
      ? actualRoundOf32Pairs
      : completedGroupRoundOf32Pairs.length > 0
        ? completedGroupRoundOf32Pairs
        : predictedRoundOf32Pairs;
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
  const completionMap = {
    r32: getR32Completion(r32Ranks, t),
    r16: getKnockoutCompletion(selected.r16 ?? [], r32Pairs, 16, t, { allowPartial: true }),
    qf: getKnockoutCompletion(selected.qf ?? [], r16Pairs, 8, t, { allowPartial: true }),
    sf: getKnockoutCompletion(selected.sf ?? [], qfPairs, 4, t, { allowPartial: true }),
    final: getKnockoutCompletion(selected.final ?? [], sfPairs, 2, t, { allowPartial: true }),
    champion: getKnockoutCompletion(selected.champion ?? [], finalPairs, 1, t, { allowPartial: true }),
  } satisfies Record<StageId, StageCompletion>;

  function setRank(team: Team, rank: Rank) {
    setErrors((current) => ({ ...current, r32: "" }));
    setSavedStage(null);
    setSubmittedStages((current) => markStageAndDownstreamUnsubmitted(current, "r32"));
    setR32Ranks((current) => {
      const existing = current[team.id];
      const next = { ...current };

      if (existing === rank) {
        delete next[team.id];
        const nextRoundOf32Pairs =
          actualRoundOf32Pairs.length > 0
            ? actualRoundOf32Pairs
            : completedGroupRoundOf32Pairs.length > 0
              ? completedGroupRoundOf32Pairs
              : buildRoundOf32Pairs(next);
        setSelected((selectedCurrent) =>
          sanitizeAfterR32Change(selectedCurrent, next, nextRoundOf32Pairs),
        );
        return next;
      }

      if (rank === 3) {
        const currentThirdCount = Object.entries(next).filter(
          ([teamId, teamRank]) => teamId !== team.id && teamRank === 3,
        ).length;
        if (currentThirdCount >= 8) {
          setErrors((errorCurrent) => ({
            ...errorCurrent,
            r32: t("predictions.onlyEightThirds"),
          }));
          return current;
        }
      }

      for (const groupTeam of teams.filter((candidate) => candidate.group === team.group)) {
        if (next[groupTeam.id] === rank) delete next[groupTeam.id];
      }

      next[team.id] = rank;
      const nextRoundOf32Pairs =
        actualRoundOf32Pairs.length > 0
          ? actualRoundOf32Pairs
          : completedGroupRoundOf32Pairs.length > 0
            ? completedGroupRoundOf32Pairs
            : buildRoundOf32Pairs(next);
      setSelected((selectedCurrent) =>
        sanitizeAfterR32Change(selectedCurrent, next, nextRoundOf32Pairs),
      );
      return next;
    });
  }

  function setPairWinner(stage: Exclude<StageId, "r32">, pairIndex: number, teamId: string) {
    setErrors((current) => ({ ...current, [stage]: "" }));
    setSavedStage(null);
    setSubmittedStages((current) => markStageAndDownstreamUnsubmitted(current, stage));
    setSelected((current) => {
      const nextStage = [...(current[stage] ?? [])];
      nextStage[pairIndex] = nextStage[pairIndex] === teamId ? "" : teamId;
      return sanitizeAfterStageChange({ ...current, [stage]: nextStage }, stage);
    });
  }

  async function saveStage(stage: StageId) {
    const completion = completionMap[stage];
    if (!completion.complete) {
      setErrors((current) => ({ ...current, [stage]: completion.message }));
      return;
    }

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
      setSubmittedStages((current) => ({
        ...markDownstreamUnsubmitted(current, stage),
        [stage]: true,
      }));
      setEditingStages((current) => ({ ...current, [stage]: false }));
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [stage]: err instanceof Error ? err.message : "Network error.",
      }));
    } finally {
      setSaving(null);
    }
  }

  function editStage(stage: StageId) {
    if (isStageLocked(stage, lockedStages)) return;
    setSavedStage(null);
    setErrors((current) => ({ ...current, [stage]: "" }));
    setEditingStages((current) => ({ ...current, [stage]: true }));
  }

  const r32ControlsDisabled =
    isStageLocked("r32", lockedStages) || (submittedStages.r32 && !editingStages.r32);

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">{t("stage.r32")}</h2>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              {t("predictions.r32Body")}
            </p>
          </div>
          <span className="rounded-full bg-[var(--color-panel-high)] px-3 py-1 text-xs font-bold">
            {t("predictions.selected", { count: Object.keys(r32Ranks).length, thirds: thirdPlaceCount(r32Ranks) })}
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {teamsByGroup.map(({ group, teams: groupTeams }) => (
            <div key={group} className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
              <h3 className="font-display text-base font-bold">
                {t("common.group")} {group}
              </h3>
              <div className="mt-3 space-y-2">
                {groupTeams.map((team) => (
                  <div
                    key={team.id}
                    className="grid gap-2 rounded-lg border border-white/10 bg-[var(--color-panel-high)] p-3 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <span className="font-bold">{team.code}</span>
                      <span className="ms-2 text-sm text-[var(--color-fg)]">{getTeamName(team, locale)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[1, 2, 3].map((rank) => {
                        const active = r32Ranks[team.id] === rank;
                        return (
                          <button
                            key={rank}
                            type="button"
                            disabled={r32ControlsDisabled}
                            onClick={() => setRank(team, rank as Rank)}
                            className={
                              "rounded-md px-3 py-1.5 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 " +
                              (active
                                ? "bg-[var(--color-accent)] text-[#102000]"
                                : "bg-[var(--color-panel-highest)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")
                            }
                          >
                            {rankOrdinal(rank as Rank, locale)}
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
          savedLabel={t("common.saved")}
          saveLabel={t("common.save")}
          savingLabel={t("common.saving")}
          defaultHelper={t("predictions.lockMatch1")}
          error={errors.r32}
          helper={completionMap.r32.message}
          disabled={!completionMap.r32.complete}
          submitted={submittedStages.r32}
          editing={editingStages.r32}
          locked={isStageLocked("r32", lockedStages)}
          editLabel={t("common.edit")}
          submittedMessage={t("predictions.submittedMessage")}
          submittedEditHint={t("predictions.submittedEditHint")}
          submittedLockedHint={t("predictions.submittedLockedHint")}
          onEdit={() => editStage("r32")}
          onSave={() => void saveStage("r32")}
        />
      </section>

      {knockoutStages.map((stage) => (
        <KnockoutStage
          key={stage.id}
          stage={stage.id}
          label={matchStageLabelForForm(stage.id, locale)}
          qualifyingStageLabel={qualifyingStageLabelForForm(stage.id, locale)}
          translate={t}
          expected={stage.expected}
          pairs={pairMap[stage.id]}
          selectedTeamIds={selected[stage.id] ?? []}
          completion={completionMap[stage.id]}
          locale={locale}
          saving={saving}
          savedStage={savedStage}
          savedLabel={locale === "he" ? "נשמר" : "Saved"}
          saveLabel={locale === "he" ? "שמירה" : "Save"}
          savingLabel={locale === "he" ? "שומר..." : "Saving..."}
          defaultHelper={t("predictions.lockKnockout")}
          error={errors[stage.id]}
          submitted={submittedStages[stage.id]}
          editing={editingStages[stage.id]}
          locked={isStageLocked(stage.id, lockedStages)}
          controlsDisabled={
            isStageLocked(stage.id, lockedStages) ||
            (submittedStages[stage.id] && !editingStages[stage.id])
          }
          editLabel={t("common.edit")}
          submittedMessage={t("predictions.submittedMessage")}
          submittedEditHint={t("predictions.submittedEditHint")}
          submittedLockedHint={t("predictions.submittedLockedHint")}
          onPick={setPairWinner}
          onEdit={() => editStage(stage.id)}
          onSave={() => void saveStage(stage.id)}
        />
      ))}
    </div>
  );
}

function KnockoutStage({
  stage,
  label,
  qualifyingStageLabel,
  translate,
  expected,
  pairs,
  selectedTeamIds,
  completion,
  locale,
  saving,
  savedStage,
  savedLabel,
  saveLabel,
  savingLabel,
  defaultHelper,
  error,
  submitted,
  editing,
  locked,
  controlsDisabled,
  editLabel,
  submittedMessage,
  submittedEditHint,
  submittedLockedHint,
  onPick,
  onEdit,
  onSave,
}: {
  stage: Exclude<StageId, "r32">;
  label: string;
  qualifyingStageLabel: string;
  translate: Translate;
  expected: number;
  pairs: Pair[];
  selectedTeamIds: string[];
  completion: StageCompletion;
  locale: Locale;
  saving: string | null;
  savedStage: string | null;
  savedLabel: string;
  saveLabel: string;
  savingLabel: string;
  defaultHelper: string;
  error?: string;
  submitted: boolean;
  editing: boolean;
  locked: boolean;
  controlsDisabled: boolean;
  editLabel: string;
  submittedMessage: string;
  submittedEditHint: string;
  submittedLockedHint: string;
  onPick: (stage: Exclude<StageId, "r32">, pairIndex: number, teamId: string) => void;
  onEdit: () => void;
  onSave: () => void;
}) {
  return (
    <section className="glass-card rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{label}</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {translate("predictions.chooseWinners", {
              count: expected,
              stage: qualifyingStageLabel,
            })}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-panel-high)] px-3 py-1 text-xs font-bold">
          {translate("predictions.selectedCount", { picked: completion.picked, expected })}
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
                placeholder={pair.homePlaceholder}
                active={Boolean(pair.homeId && selectedTeamIds[index] === pair.homeId)}
                locale={locale}
                disabled={controlsDisabled}
                entrantId={pair.homeId}
                onClick={() => pair.homeId && onPick(stage, index, pair.homeId)}
              />
              <div className="my-2 text-center text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                {translate("common.vs")}
              </div>
              <PairTeamButton
                team={pair.away}
                placeholder={pair.awayPlaceholder}
                active={Boolean(pair.awayId && selectedTeamIds[index] === pair.awayId)}
                locale={locale}
                disabled={controlsDisabled}
                entrantId={pair.awayId}
                onClick={() => pair.awayId && onPick(stage, index, pair.awayId)}
              />
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)] md:col-span-2">
            {translate("predictions.previousFirst")}
          </div>
        )}
      </div>

      <StageFooter
        stage={stage}
        saving={saving}
        savedStage={savedStage}
        savedLabel={savedLabel}
        saveLabel={saveLabel}
        savingLabel={savingLabel}
        defaultHelper={defaultHelper}
        error={error}
        helper={completion.message}
        disabled={!completion.complete}
        submitted={submitted}
        editing={editing}
        locked={locked}
        editLabel={editLabel}
        submittedMessage={submittedMessage}
        submittedEditHint={submittedEditHint}
        submittedLockedHint={submittedLockedHint}
        onEdit={onEdit}
        onSave={onSave}
      />
    </section>
  );
}

function PairTeamButton({
  team,
  placeholder,
  active,
  locale,
  entrantId,
  disabled = false,
  onClick,
}: {
  team?: Team;
  placeholder?: string;
  active: boolean;
  locale: Locale;
  entrantId?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!entrantId || disabled}
      onClick={onClick}
      className={
        "w-full rounded-lg border px-3 py-2 text-start text-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 " +
        (active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          : "border-white/10 bg-[var(--color-panel-high)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")
      }
    >
      {team ? (
        <>
          <span className="font-bold">{team.code}</span>
          <span className="ms-2">{getTeamName(team, locale)}</span>
        </>
      ) : placeholder ? (
        <span className="font-bold" dir="ltr">
          {placeholder}
        </span>
      ) : (
        locale === "he" ? "ממתין לקבוצה" : "Waiting for qualifier"
      )}
    </button>
  );
}

function StageFooter({
  stage,
  saving,
  savedStage,
  savedLabel,
  saveLabel,
  savingLabel,
  defaultHelper,
  error,
  helper,
  disabled = false,
  submitted,
  editing,
  locked,
  editLabel,
  submittedMessage,
  submittedEditHint,
  submittedLockedHint,
  onEdit,
  onSave,
}: {
  stage: StageId;
  saving: string | null;
  savedStage: string | null;
  savedLabel: string;
  saveLabel: string;
  savingLabel: string;
  defaultHelper: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  submitted: boolean;
  editing: boolean;
  locked: boolean;
  editLabel: string;
  submittedMessage: string;
  submittedEditHint: string;
  submittedLockedHint: string;
  onEdit: () => void;
  onSave: () => void;
}) {
  const submittedReadOnly = submitted && !editing;
  const saveDisabled = saving !== null || disabled || locked || submittedReadOnly;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
      <div className="text-sm">
        {error ? (
          <span className="font-semibold text-[var(--color-danger)]">{error}</span>
        ) : savedStage === stage ? (
          <span className="font-semibold text-[var(--color-accent)]">
            {submittedMessage}
          </span>
        ) : submittedReadOnly ? (
          <span className="font-semibold text-[var(--color-accent)]">
            {locked ? submittedLockedHint : submittedEditHint}
          </span>
        ) : helper ? (
          <span className="text-[var(--color-fg-muted)]">{helper}</span>
        ) : (
          <span className="text-[var(--color-fg-muted)]">{defaultHelper}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saveDisabled}
          onClick={onSave}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[#102000] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving === stage ? savingLabel : submittedReadOnly ? savedLabel : saveLabel}
        </button>
        {submitted ? (
          <button
            type="button"
            disabled={saving !== null || locked || editing}
            onClick={onEdit}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-[var(--color-gold)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function buildRoundOf32Pairs(ranks: Record<string, Rank>): Pair[] {
  return buildOfficialRoundOf32Pairs(teams, ranks).map(withPairEntrantIds);
}

function buildRoundOf32PairsFromMatches(matches: Match[]): Pair[] {
  const sortedMatches = matches
    .filter((match) => match.stage === "r32")
    .sort(
      (a, b) =>
        (roundOf32BracketOrder.get(a.number) ?? Number.MAX_SAFE_INTEGER) -
          (roundOf32BracketOrder.get(b.number) ?? Number.MAX_SAFE_INTEGER) ||
        a.number - b.number,
    );
  if (
    sortedMatches.length !== 16 ||
    sortedMatches.every((match) => !match.homeTeamId && !match.awayTeamId)
  ) {
    return [];
  }

  return sortedMatches
    .map((match) => ({
      label: `Match ${match.number}`,
      home: getTeamById(match.homeTeamId),
      away: getTeamById(match.awayTeamId),
      homeId: match.homeTeamId,
      awayId: match.awayTeamId,
      homePlaceholderKey: match.homePlaceholder ? placeholderKey(match.homePlaceholder) : undefined,
      awayPlaceholderKey: match.awayPlaceholder ? placeholderKey(match.awayPlaceholder) : undefined,
      homePlaceholder: match.homePlaceholder ? normalizePlaceholderLabel(match.homePlaceholder) : undefined,
      awayPlaceholder: match.awayPlaceholder ? normalizePlaceholderLabel(match.awayPlaceholder) : undefined,
    }));
}

function buildRoundOf32PairsFromCompletedGroups(matches: Match[]): Pair[] {
  const ranks = Object.fromEntries(getCompletedGroupQualifierRanks(teams, matches));
  return Object.keys(ranks).length > 0 ? buildRoundOf32Pairs(ranks) : [];
}

function buildBestRoundOf32Pairs(matches: Match[], fallbackRanks: Record<string, Rank>): Pair[] {
  const actualPairs = buildRoundOf32PairsFromMatches(matches);
  if (actualPairs.length > 0) return actualPairs;
  const completedGroupPairs = buildRoundOf32PairsFromCompletedGroups(matches);
  if (completedGroupPairs.length > 0) return completedGroupPairs;
  return buildRoundOf32Pairs(fallbackRanks);
}

function buildPairsFromTeamIds(teamIds: string[], prefix: string): Pair[] {
  const pairs: Pair[] = [];
  for (let index = 0; index < teamIds.length; index += 2) {
    const homeId = teamIds[index] || undefined;
    const awayId = teamIds[index + 1] || undefined;
    pairs.push({
      label: `${prefix} Match ${pairs.length + 1}`,
      home: getTeamById(homeId),
      away: getTeamById(awayId),
      homeId,
      awayId,
      homePlaceholder: placeholderLabel(homeId),
      awayPlaceholder: placeholderLabel(awayId),
      homePlaceholderKey: isPlaceholderId(homeId) ? homeId : undefined,
      awayPlaceholderKey: isPlaceholderId(awayId) ? awayId : undefined,
    });
  }
  return pairs;
}

function getTeamById(teamId: string | undefined): Team | undefined {
  if (!teamId) return undefined;
  return teams.find((team) => team.id === teamId);
}

function thirdPlaceCount(ranks: Record<string, Rank>): number {
  return Object.values(ranks).filter((rank) => rank === 3).length;
}

function getSubmittedStages(predictions: SavedStagePredictions): Record<StageId, boolean> {
  return {
    r32: isCompleteR32Prediction(predictions.r32Ranks),
    r16: (predictions.teams.r16 ?? []).filter(Boolean).length > 0,
    qf: (predictions.teams.qf ?? []).filter(Boolean).length > 0,
    sf: (predictions.teams.sf ?? []).filter(Boolean).length > 0,
    final: (predictions.teams.final ?? []).filter(Boolean).length > 0,
    champion: (predictions.teams.champion ?? []).filter(Boolean).length > 0,
  };
}

function isCompleteR32Prediction(ranks: Record<string, Rank>): boolean {
  const picked = Object.keys(ranks).length;
  const firsts = Object.values(ranks).filter((rank) => rank === 1).length;
  const seconds = Object.values(ranks).filter((rank) => rank === 2).length;
  const thirds = Object.values(ranks).filter((rank) => rank === 3).length;
  return (
    picked === stageExpectedCounts.r32 &&
    firsts === 12 &&
    seconds === 12 &&
    thirds === 8
  );
}

function markStageAndDownstreamUnsubmitted(
  current: Record<StageId, boolean>,
  stage: StageId,
): Record<StageId, boolean> {
  return {
    ...markDownstreamUnsubmitted(current, stage),
    [stage]: false,
  };
}

function markDownstreamUnsubmitted(
  current: Record<StageId, boolean>,
  stage: StageId,
): Record<StageId, boolean> {
  const next = { ...current };
  for (const downstreamStage of downstreamStagesByStage[stage]) {
    next[downstreamStage] = false;
  }
  return next;
}

function isStageLocked(
  stage: StageId,
  lockedStages: { r32: boolean; knockout: boolean },
): boolean {
  return stage === "r32" ? lockedStages.r32 : lockedStages.knockout;
}

function getR32Completion(ranks: Record<string, Rank>, t: Translate): StageCompletion {
  const picked = Object.keys(ranks).length;
  const firsts = Object.values(ranks).filter((rank) => rank === 1).length;
  const seconds = Object.values(ranks).filter((rank) => rank === 2).length;
  const thirds = Object.values(ranks).filter((rank) => rank === 3).length;
  const complete = picked === 32 && firsts === 12 && seconds === 12 && thirds === 8;

  return {
    picked,
    complete,
    message: complete
      ? t("predictions.lockMatch1")
      : t("predictions.r32Need", { firsts, seconds, thirds }),
  };
}

function getKnockoutCompletion(
  selectedTeamIds: string[],
  pairs: Pair[],
  expected: number,
  t: Translate,
  options: { allowPartial?: boolean } = {},
): StageCompletion {
  const playablePairs = pairs.filter((pair) => pair.home && pair.away);
  const selectablePairs = pairs.filter((pair) => pair.homeId || pair.awayId);
  const hasPlaceholder = pairs.some(
    (pair) => isPlaceholderId(pair.homeId) || isPlaceholderId(pair.awayId),
  );
  const picked = selectedTeamIds.filter(Boolean).length;
  const selectedTeamsAreValid = selectedTeamIds.every((selectedTeamId, index) => {
    if (!selectedTeamId) return true;
    const pair = pairs[index];
    return selectedTeamId === pair?.homeId || selectedTeamId === pair?.awayId;
  });
  const complete =
    options.allowPartial && (playablePairs.length < expected || hasPlaceholder)
      ? picked > 0 && selectedTeamsAreValid
      : playablePairs.length === expected &&
        picked === expected &&
        playablePairs.every((pair, index) => {
          const selectedTeamId = selectedTeamIds[index];
          return selectedTeamId === pair.homeId || selectedTeamId === pair.awayId;
        });

  return {
    picked,
    complete,
    message: complete
      ? t("predictions.lockKnockout")
      : selectablePairs.length < expected
        ? t("predictions.completePrevious")
        : t("predictions.chooseExpected", { expected }),
  };
}

function sanitizeAfterR32Change(
  current: Record<string, string[]>,
  ranks: Record<string, Rank>,
  roundOf32Pairs: Pair[],
): Record<string, string[]> {
  const next: Record<string, string[]> = {
    ...current,
    r32: sortedRankTeamIds(ranks),
  };
  next.r16 = keepValidPairWinners(next.r16 ?? [], roundOf32Pairs);
  next.qf = keepValidPairWinners(next.qf ?? [], buildPairsFromTeamIds(next.r16 ?? [], "R16"));
  next.sf = keepValidPairWinners(next.sf ?? [], buildPairsFromTeamIds(next.qf ?? [], "QF"));
  next.final = keepValidPairWinners(next.final ?? [], buildPairsFromTeamIds(next.sf ?? [], "SF"));
  next.champion = keepValidPairWinners(
    next.champion ?? [],
    buildPairsFromTeamIds(next.final ?? [], "Final"),
  );
  return next;
}

function sanitizeSelectionsWithRoundOf32Pairs(
  current: Record<string, string[]>,
  roundOf32Pairs: Pair[],
): Record<string, string[]> {
  const next = { ...current };
  next.r16 = keepValidPairWinners(next.r16 ?? [], roundOf32Pairs);
  next.qf = keepValidPairWinners(next.qf ?? [], buildPairsFromTeamIds(next.r16 ?? [], "R16"));
  next.sf = keepValidPairWinners(next.sf ?? [], buildPairsFromTeamIds(next.qf ?? [], "QF"));
  next.final = keepValidPairWinners(next.final ?? [], buildPairsFromTeamIds(next.sf ?? [], "SF"));
  next.champion = keepValidPairWinners(
    next.champion ?? [],
    buildPairsFromTeamIds(next.final ?? [], "Final"),
  );
  return next;
}

function sanitizeAfterStageChange(
  current: Record<string, string[]>,
  stage: Exclude<StageId, "r32">,
): Record<string, string[]> {
  const next = { ...current };

  if (stage === "r16") {
    next.qf = keepValidPairWinners(next.qf ?? [], buildPairsFromTeamIds(next.r16 ?? [], "R16"));
  }
  if (stage === "r16" || stage === "qf") {
    next.sf = keepValidPairWinners(next.sf ?? [], buildPairsFromTeamIds(next.qf ?? [], "QF"));
  }
  if (stage === "r16" || stage === "qf" || stage === "sf") {
    next.final = keepValidPairWinners(next.final ?? [], buildPairsFromTeamIds(next.sf ?? [], "SF"));
  }
  if (stage !== "champion") {
    next.champion = keepValidPairWinners(
      next.champion ?? [],
      buildPairsFromTeamIds(next.final ?? [], "Final"),
    );
  }

  return next;
}

function keepValidPairWinners(selectedTeamIds: string[], pairs: Pair[]): string[] {
  const selectedTeamIdSet = new Set(selectedTeamIds.filter(Boolean));
  return pairs.map((pair, index) => {
    const selectedTeamId = selectedTeamIds[index];
    if (selectedTeamId && (pair.homeId === selectedTeamId || pair.awayId === selectedTeamId)) {
      return selectedTeamId;
    }
    if (selectedTeamId && selectedTeamId === pair.homePlaceholderKey && pair.homeId) {
      return pair.homeId;
    }
    if (selectedTeamId && selectedTeamId === pair.awayPlaceholderKey && pair.awayId) {
      return pair.awayId;
    }
    if (pair.homeId && selectedTeamIdSet.has(pair.homeId)) {
      return pair.homeId;
    }
    if (pair.awayId && selectedTeamIdSet.has(pair.awayId)) {
      return pair.awayId;
    }
    if (pair.homePlaceholderKey && selectedTeamIdSet.has(pair.homePlaceholderKey) && pair.homeId) {
      return pair.homeId;
    }
    if (pair.awayPlaceholderKey && selectedTeamIdSet.has(pair.awayPlaceholderKey) && pair.awayId) {
      return pair.awayId;
    }
    return "";
  });
}

function withPairEntrantIds(pair: Pair): Pair {
  const homePlaceholderKey = pair.homePlaceholder ? placeholderKey(pair.homePlaceholder) : undefined;
  const awayPlaceholderKey = pair.awayPlaceholder ? placeholderKey(pair.awayPlaceholder) : undefined;
  return {
    ...pair,
    homeId: pair.home?.id ?? homePlaceholderKey,
    awayId: pair.away?.id ?? awayPlaceholderKey,
    homePlaceholderKey,
    awayPlaceholderKey,
  };
}

function placeholderKey(value: string): string {
  return `placeholder:${value.replaceAll("/", "")}`;
}

function placeholderLabel(value: string | undefined): string | undefined {
  return value && isPlaceholderId(value) ? value.slice("placeholder:".length) : undefined;
}

function normalizePlaceholderLabel(value: string): string {
  return value.replaceAll("/", "");
}

function isPlaceholderId(value: string | undefined): boolean {
  return Boolean(value?.startsWith("placeholder:"));
}

function sortedRankTeamIds(ranks: Record<string, Rank>): string[] {
  return Object.entries(ranks)
    .sort((a, b) => sortByGroupAndRank(a, b))
    .map(([teamId]) => teamId);
}

function rankOrdinal(rank: Rank, locale: Locale): string {
  if (locale === "he") return rank === 1 ? "1" : rank === 2 ? "2" : "3";
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  return "3rd";
}

function matchStageLabelForForm(stage: Exclude<StageId, "r32">, locale: Locale): string {
  const labels: Record<Exclude<StageId, "r32">, { en: string; he: string }> = {
    r16: { en: "Round of 32", he: "שלב 32 האחרונות" },
    qf: { en: "Round of 16", he: "שמינית גמר" },
    sf: { en: "Quarter-finals", he: "רבע גמר" },
    final: { en: "Semi-finals", he: "חצי גמר" },
    champion: { en: "Final", he: "גמר" },
  };
  return labels[stage][locale];
}

function qualifyingStageLabelForForm(stage: Exclude<StageId, "r32">, locale: Locale): string {
  const labels: Record<Exclude<StageId, "r32">, { en: string; he: string }> = {
    r16: { en: "Round of 16", he: "שמינית הגמר" },
    qf: { en: "Quarter-finals", he: "רבע הגמר" },
    sf: { en: "Semi-finals", he: "חצי הגמר" },
    final: { en: "Final", he: "הגמר" },
    champion: { en: "Champion", he: "הזכייה" },
  };
  return labels[stage][locale];
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
