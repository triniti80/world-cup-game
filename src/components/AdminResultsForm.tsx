"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import {
  formatKickoff,
  getMatchName,
  getTeam,
  type Match,
} from "@/lib/world-cup/data";
import { isKnockoutStage, type PredictedWinnerSide } from "@/lib/world-cup/match-predictions";
import type { SeededMatchWithResult } from "@/lib/world-cup/repository";

type DraftResult = {
  homeScore: string;
  awayScore: string;
  winnerSide: "" | PredictedWinnerSide;
};

export function AdminResultsForm({ matches }: { matches: SeededMatchWithResult[] }) {
  const { locale, t } = useI18n();
  const [drafts, setDrafts] = useState<Record<number, DraftResult>>(
    Object.fromEntries(
      matches.map((match) => [
        match.dbId,
        {
          homeScore: match.homeScore === undefined ? "" : String(match.homeScore),
          awayScore: match.awayScore === undefined ? "" : String(match.awayScore),
          winnerSide: match.winnerSide ?? "",
        },
      ]),
    ),
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | SeededMatchWithResult["stage"]>("all");
  const [resultFilter, setResultFilter] = useState<"all" | "missing" | "entered" | "final">("all");

  const visibleMatches = useMemo(
    () =>
      matches.filter((match) => {
        const draft = drafts[match.dbId] ?? { homeScore: "", awayScore: "", winnerSide: "" };
        const hasScore = draft.homeScore !== "" && draft.awayScore !== "";
        const search = query.trim().toLocaleLowerCase();
        const haystack = [
          String(match.number),
          match.stage,
          match.group ?? "",
          match.status,
          getMatchName(match as Match),
          match.venue,
        ]
          .join(" ")
          .toLocaleLowerCase();

        return (
          (search === "" || haystack.includes(search)) &&
          (stageFilter === "all" || match.stage === stageFilter) &&
          (resultFilter === "all" ||
            (resultFilter === "missing" && !hasScore) ||
            (resultFilter === "entered" && hasScore) ||
            (resultFilter === "final" && match.status === "final"))
        );
      }),
    [drafts, matches, query, resultFilter, stageFilter],
  );

  function update(matchDbId: number, key: keyof DraftResult, value: string) {
    setErrors((current) => ({ ...current, [matchDbId]: "" }));
    setStatuses((current) => ({ ...current, [matchDbId]: "" }));
    setDrafts((current) => ({
      ...current,
      [matchDbId]: {
        ...(current[matchDbId] ?? { homeScore: "", awayScore: "", winnerSide: "" }),
        [key]: value,
      },
    }));
  }

  async function save(match: SeededMatchWithResult) {
    const draft = drafts[match.dbId];
    if (!draft) return;
    const homeScore = Number(draft.homeScore);
    const awayScore = Number(draft.awayScore);
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      setErrors((current) => ({ ...current, [match.dbId]: locale === "he" ? "צריך להזין תוצאות תקינות במספרים שלמים." : "Enter valid whole-number scores." }));
      return;
    }
    const winnerSide =
      draft.winnerSide === "home" || draft.winnerSide === "away" ? draft.winnerSide : null;
    if (isKnockoutStage(match.stage) && homeScore === awayScore && winnerSide === null) {
      setErrors((current) => ({
        ...current,
        [match.dbId]: locale === "he" ? "בחר מי עלתה בתוצאת תיקו בנוקאאוט." : "Choose who advanced for a tied knockout result.",
      }));
      return;
    }

    setSaving(match.dbId);
    setErrors((current) => ({ ...current, [match.dbId]: "" }));
    setStatuses((current) => ({ ...current, [match.dbId]: "" }));
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchDbId: match.dbId,
          homeScore,
          awayScore,
          winnerSide,
          status: "final",
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors((current) => ({
          ...current,
          [match.dbId]: body?.error ?? `Server responded ${res.status}.`,
        }));
        return;
      }
      setStatuses((current) => ({ ...current, [match.dbId]: locale === "he" ? "התוצאה נשמרה והניקוד חושב מחדש." : "Final score saved and scoring recalculated." }));
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [match.dbId]: err instanceof Error ? err.message : t("auth.networkError"),
      }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="glass-card rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold">{locale === "he" ? "ניהול תוצאות" : "Admin Results"}</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          {locale === "he"
            ? "הזן תוצאות סופיות למשחקים. שמירת תוצאה מחשבת מחדש את נקודות ניחושי התוצאה."
            : "Enter final scores for seeded fixtures. Saving a final score recalculates score-prediction points."}
        </p>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-3 md:grid-cols-[1fr_auto_auto_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === "he" ? "חיפוש משחק, קבוצה, אצטדיון" : "Search match, team, venue"}
          className={inputClass}
        />
        <select
          value={stageFilter}
          onChange={(event) =>
            setStageFilter(event.target.value as "all" | SeededMatchWithResult["stage"])
          }
          className={inputClass}
          aria-label="Filter result stage"
        >
          <option value="all">{locale === "he" ? "כל השלבים" : "All stages"}</option>
          {["group", "r32", "r16", "qf", "sf", "third", "final"].map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
        <select
          value={resultFilter}
          onChange={(event) =>
            setResultFilter(event.target.value as "all" | "missing" | "entered" | "final")
          }
          className={inputClass}
          aria-label="Filter result status"
        >
          <option value="all">{locale === "he" ? "כל התוצאות" : "All results"}</option>
          <option value="missing">{locale === "he" ? "תוצאה חסרה" : "Missing score"}</option>
          <option value="entered">{locale === "he" ? "תוצאה הוזנה" : "Score entered"}</option>
          <option value="final">{locale === "he" ? "סומן כסופי" : "Marked final"}</option>
        </select>
        <div className="flex items-center rounded-lg bg-[var(--color-panel-highest)] px-3 text-sm font-bold text-[var(--color-accent)]">
          {visibleMatches.length}/{matches.length}
        </div>
      </div>

      <div className="space-y-3">
        {visibleMatches.map((match) => {
          const draft = drafts[match.dbId] ?? { homeScore: "", awayScore: "", winnerSide: "" };
          const error = errors[match.dbId];
          const status = statuses[match.dbId];
          const homeName = getTeam(match.homeTeamId)?.name ?? match.homePlaceholder ?? "Home";
          const awayName = getTeam(match.awayTeamId)?.name ?? match.awayPlaceholder ?? "Away";
          const needsWinnerSide =
            isKnockoutStage(match.stage) &&
            draft.homeScore !== "" &&
            draft.awayScore !== "" &&
            Number(draft.homeScore) === Number(draft.awayScore);
          return (
            <article
              key={match.dbId}
              className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                    {t("common.match")} {match.number} · {formatKickoff(match.kickoffAtUtc, locale)}
                  </div>
                  <h3 className="mt-1 font-display text-base font-bold">
                    {getMatchName(match as Match, locale)}
                  </h3>
                </div>
                <span className="rounded-full bg-[var(--color-panel-highest)] px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
                  {match.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={draft.homeScore}
                  onChange={(event) => update(match.dbId, "homeScore", event.target.value)}
                  className="h-11 w-16 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] text-center font-display text-lg font-extrabold text-[var(--color-accent)] outline-none focus:border-[var(--color-accent)]"
                  aria-label={`Home score for match ${match.number}`}
                />
                <span className="font-display text-lg font-bold text-[var(--color-fg-muted)]">-</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={draft.awayScore}
                  onChange={(event) => update(match.dbId, "awayScore", event.target.value)}
                  className="h-11 w-16 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] text-center font-display text-lg font-extrabold text-[var(--color-accent)] outline-none focus:border-[var(--color-accent)]"
                  aria-label={`Away score for match ${match.number}`}
                />
                <button
                  type="button"
                  disabled={saving !== null}
                  onClick={() => void save(match)}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[#102000] disabled:opacity-60"
                >
                  {saving === match.dbId ? t("common.saving") : locale === "he" ? "שמירת תוצאה" : "Save Final"}
                </button>
              </div>

              {needsWinnerSide ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-[var(--color-panel-high)] p-3">
                  <div className="mb-2 text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                    {locale === "he" ? "מנצחת אחרי הארכה או פנדלים" : "Winner after extra time or penalties"}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(["home", "away"] as const).map((side) => {
                      const active = draft.winnerSide === side;
                      return (
                        <button
                          key={side}
                          type="button"
                          onClick={() => update(match.dbId, "winnerSide", side)}
                          className={
                            "rounded-lg border px-3 py-2 text-start text-sm font-bold transition active:scale-95 " +
                            (active
                              ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                              : "border-white/10 bg-[var(--color-panel-highest)] text-[var(--color-fg-muted)]")
                          }
                        >
                          {side === "home" ? homeName : awayName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {(error || status) && (
                <div
                  className={
                    "mt-3 rounded-lg border px-3 py-2 text-sm " +
                    (error
                      ? "border-[var(--color-danger)] bg-[var(--color-danger)]/10"
                      : "border-[var(--color-accent)] bg-[var(--color-accent)]/10")
                  }
                >
                  {error ?? status}
                </div>
              )}
            </article>
          );
        })}
        {visibleMatches.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
            No matches match these filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]";
