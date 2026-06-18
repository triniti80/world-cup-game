"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { formatKickoff, getMatchLockAt, getTeam, getTeamName, type Match } from "@/lib/world-cup/data";
import { isKnockoutStage, type PredictedWinnerSide } from "@/lib/world-cup/match-predictions";
import { OutcomePoints } from "@/components/world-cup/OutcomePoints";
import { TeamBadge } from "@/components/world-cup/TeamBadge";

type Prediction = {
  homeScore: string;
  awayScore: string;
  predictedWinnerSide: "" | PredictedWinnerSide;
};

type SavedPrediction = {
  homeScore: number;
  awayScore: number;
  predictedWinnerSide?: PredictedWinnerSide;
  updatedAt: string;
};

type PredictionFormProps = {
  matches: Match[];
  initialPredictions?: Record<string, SavedPrediction>;
};

export function PredictionForm({ matches, initialPredictions = {} }: PredictionFormProps) {
  const { locale, t } = useI18n();
  const initial = useMemo(
    () =>
      Object.fromEntries(
        matches.map((match) => {
          const saved = initialPredictions[match.id];
          return [
            match.id,
            {
              homeScore: saved ? String(saved.homeScore) : "",
              awayScore: saved ? String(saved.awayScore) : "",
              predictedWinnerSide: saved?.predictedWinnerSide ?? "",
            },
          ];
        }),
      ) as Record<string, Prediction>,
    [matches, initialPredictions],
  );
  const [predictions, setPredictions] = useState(initial);
  const [savedPredictions, setSavedPredictions] = useState(initialPredictions);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setPredictions((current) => ({ ...initial, ...current }));
    setSavedPredictions((current) => ({ ...initialPredictions, ...current }));
  }, [initial, initialPredictions]);

  function update(matchId: string, key: keyof Prediction, value: string) {
    setErrors((current) => ({ ...current, [matchId]: "" }));
    setPredictions((current) => ({
      ...current,
      [matchId]: {
        ...(current[matchId] ?? { homeScore: "", awayScore: "", predictedWinnerSide: "" }),
        [key]: value,
      },
    }));
  }

  async function savePrediction(matchId: string) {
    const prediction = predictions[matchId];
    if (!prediction) return;

    const homeScore = Number(prediction.homeScore);
    const awayScore = Number(prediction.awayScore);
    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      setErrors((current) => ({ ...current, [matchId]: t("predictions.enterScores") }));
      return;
    }

    const match = matches.find((candidate) => candidate.id === matchId);
    const predictedWinnerSide =
      prediction.predictedWinnerSide === "home" || prediction.predictedWinnerSide === "away"
        ? prediction.predictedWinnerSide
        : null;
    if (
      match &&
      isKnockoutStage(match.stage) &&
      homeScore === awayScore &&
      predictedWinnerSide === null
    ) {
      setErrors((current) => ({
        ...current,
        [matchId]: t("predictions.chooseAdvance"),
      }));
      return;
    }

    setSavingMatchId(matchId);
    setErrors((current) => ({ ...current, [matchId]: "" }));
    try {
      const res = await fetch("/api/predictions/matches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, homeScore, awayScore, predictedWinnerSide }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors((current) => ({
          ...current,
          [matchId]: body?.error ?? `Server responded ${res.status}.`,
        }));
        return;
      }

      setSavedPredictions((current) => ({
        ...current,
        [matchId]: {
          homeScore,
          awayScore,
          predictedWinnerSide:
            body?.prediction?.predictedWinnerSide === "home" ||
            body?.prediction?.predictedWinnerSide === "away"
              ? body.prediction.predictedWinnerSide
              : undefined,
          updatedAt: body?.prediction?.updatedAt ?? new Date().toISOString(),
        },
      }));
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [matchId]: err instanceof Error ? err.message : t("auth.networkError"),
      }));
    } finally {
      setSavingMatchId((current) => (current === matchId ? null : current));
    }
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const home = getTeamName(getTeam(match.homeTeamId), locale) ?? match.homePlaceholder ?? t("common.tbd");
        const away = getTeamName(getTeam(match.awayTeamId), locale) ?? match.awayPlaceholder ?? t("common.tbd");
        const lockAt = getMatchLockAt(match);
        const locked = Date.now() >= lockAt.getTime();
        const prediction = predictions[match.id] ?? {
          homeScore: "",
          awayScore: "",
          predictedWinnerSide: "",
        };
        const complete = isPredictionComplete(match, prediction);
        const savedPrediction = savedPredictions[match.id];
        const winnerSide = effectiveWinnerSide(match, prediction);
        const needsAdvancingSide =
          isKnockoutStage(match.stage) &&
          prediction.homeScore !== "" &&
          prediction.awayScore !== "" &&
          Number(prediction.homeScore) === Number(prediction.awayScore);
        const saved =
          Boolean(savedPrediction) &&
          String(savedPrediction?.homeScore) === prediction.homeScore &&
          String(savedPrediction?.awayScore) === prediction.awayScore &&
          (savedPrediction?.predictedWinnerSide ?? null) === winnerSide;
        const saving = savingMatchId === match.id;
        const error = errors[match.id];
        const hasActualScore = match.homeScore !== undefined && match.awayScore !== undefined;
        const status = locked
          ? t("predictions.locked")
          : saved
            ? t("common.saved")
            : complete
              ? t("predictions.unsaved")
              : t("common.missing");

        return (
          <div
            key={match.id}
            className={
              "glass-card rounded-xl p-4 transition " +
              (saved ? "border-[var(--color-accent)] glow-lime" : "")
            }
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                {t("common.match")} {match.number} · {formatKickoff(match.kickoffAtUtc, locale)}
              </div>
              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-bold " +
                  (locked
                    ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                    : saved
                      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : complete
                        ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
                        : "bg-[var(--color-panel-high)] text-[var(--color-fg-muted)]")
                }
              >
                {status}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <TeamBadge teamId={match.homeTeamId} label={home} locale={locale} />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  disabled={locked}
                  value={prediction.homeScore}
                  onChange={(event) => update(match.id, "homeScore", event.target.value)}
                  className="h-12 w-12 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] text-center font-display text-xl font-extrabold text-[var(--color-accent)] outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
                />
                <span className="font-display text-xl font-extrabold text-[var(--color-fg-muted)]">-</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  disabled={locked}
                  value={prediction.awayScore}
                  onChange={(event) => update(match.id, "awayScore", event.target.value)}
                  className="h-12 w-12 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] text-center font-display text-xl font-extrabold text-[var(--color-accent)] outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
                />
              </div>
              <TeamBadge teamId={match.awayTeamId} label={away} locale={locale} />
            </div>

            <div className="mt-4 space-y-3">
              <OutcomePoints matchNumber={match.number} locale={locale} showExactHint />
              {hasActualScore ? (
                <div className="inline-flex rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                  {t("match.actualResult")}: {match.homeScore}-{match.awayScore}
                </div>
              ) : null}
            </div>

            {needsAdvancingSide ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-3">
                <div className="mb-2 text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                  {t("predictions.chooseAdvances")}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["home", "away"] as const).map((side) => {
                    const active = prediction.predictedWinnerSide === side;
                    const label = side === "home" ? home : away;
                    return (
                      <button
                        key={side}
                        type="button"
                        disabled={locked}
                        onClick={() => update(match.id, "predictedWinnerSide", side)}
                        className={
                          "rounded-lg border px-3 py-2 text-start text-sm font-bold transition active:scale-95 disabled:opacity-50 " +
                          (active
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                            : "border-white/10 bg-[var(--color-panel-high)] text-[var(--color-fg-muted)] hover:bg-[var(--color-panel-highest)]")
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-[var(--color-fg-muted)]">
              <div>
                <span>{t("predictions.locks", { time: formatKickoff(lockAt.toISOString(), locale) })}</span>
                {error ? (
                  <div className="mt-1 font-semibold text-[var(--color-danger)]">{error}</div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={locked || !complete || saving}
                onClick={() => void savePrediction(match.id)}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-bold text-[#102000] transition active:scale-95 disabled:opacity-50"
              >
                {saving ? t("common.saving") : saved ? t("common.saved") : t("predictions.savePrediction")}
              </button>
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
        {t("predictions.savedBody")}
      </div>
    </div>
  );
}

function isPredictionComplete(match: Match, prediction: Prediction): boolean {
  if (prediction.homeScore === "" || prediction.awayScore === "") return false;
  if (!isKnockoutStage(match.stage)) return true;
  if (Number(prediction.homeScore) !== Number(prediction.awayScore)) return true;
  return prediction.predictedWinnerSide === "home" || prediction.predictedWinnerSide === "away";
}

function effectiveWinnerSide(
  match: Match,
  prediction: Prediction,
): PredictedWinnerSide | null | undefined {
  if (prediction.homeScore === "" || prediction.awayScore === "") return undefined;
  const homeScore = Number(prediction.homeScore);
  const awayScore = Number(prediction.awayScore);
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  if (!isKnockoutStage(match.stage)) return null;
  return prediction.predictedWinnerSide === "home" || prediction.predictedWinnerSide === "away"
    ? prediction.predictedWinnerSide
    : undefined;
}
