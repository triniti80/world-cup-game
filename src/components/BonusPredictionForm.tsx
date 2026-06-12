"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { TopScorerInput } from "@/components/TopScorerInput";
import { getTeamName, teams } from "@/lib/world-cup/data";
import type { LeagueGameMode, SavedBonusPredictions } from "@/lib/world-cup/repository";

type BonusPredictionFormProps = {
  gameMode: LeagueGameMode;
  initialPredictions: SavedBonusPredictions;
  locked: {
    top_scorer: boolean;
    winner: boolean;
  };
};

export function BonusPredictionForm({ gameMode, initialPredictions, locked }: BonusPredictionFormProps) {
  const { locale, t } = useI18n();
  const [topScorer, setTopScorer] = useState(initialPredictions.topScorer?.playerName ?? "");
  const [winner, setWinner] = useState(initialPredictions.tournamentWinner?.teamId ?? "");
  const [submitted, setSubmitted] = useState({
    top_scorer: Boolean(initialPredictions.topScorer),
    winner: Boolean(initialPredictions.tournamentWinner),
  });
  const [editing, setEditing] = useState({
    top_scorer: false,
    winner: false,
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(payload: unknown, key: "top_scorer" | "winner") {
    setSaving(key);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/predictions/bonus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Server responded ${res.status}.`);
        return;
      }
      setSubmitted((current) => ({ ...current, [key]: true }));
      setEditing((current) => ({ ...current, [key]: false }));
      setMessage(t("predictions.submittedMessage"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.networkError"));
    } finally {
      setSaving(null);
    }
  }

  function edit(key: "top_scorer" | "winner") {
    if (locked[key]) return;
    setMessage(null);
    setError(null);
    setEditing((current) => ({ ...current, [key]: true }));
  }

  const topScorerReadOnly = submitted.top_scorer && !editing.top_scorer;
  const winnerReadOnly = submitted.winner && !editing.winner;
  const topScorerLocked = locked.top_scorer;
  const winnerLocked = locked.winner;

  return (
    <section className="glass-card rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{t("predictions.bonusTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {t("predictions.bonusBody")}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-gold)]/15 px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
          {t("predictions.pointsEach")}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">
            {locale === "he" ? "מלך השערים" : "Top scorer"}
          </span>
          <div className="flex gap-2">
            <TopScorerInput
              value={topScorer}
              onChange={setTopScorer}
              placeholder={locale === "he" ? "שם שחקן" : "Player name"}
              disabled={topScorerLocked || topScorerReadOnly}
            />
            <BonusActionButtons
              saving={saving}
              saveKey="top_scorer"
              submitted={submitted.top_scorer}
              readOnly={topScorerReadOnly}
              editing={editing.top_scorer}
              locked={topScorerLocked}
              disabled={topScorer.trim().length < 2}
              saveLabel={t("common.save")}
              savedLabel={t("common.saved")}
              savingLabel={t("common.saving")}
              editLabel={t("common.edit")}
              onSave={() => void save({ type: "top_scorer", playerName: topScorer }, "top_scorer")}
              onEdit={() => edit("top_scorer")}
            />
          </div>
          <BonusSubmittedHint
            submitted={submitted.top_scorer}
            readOnly={topScorerReadOnly}
            locked={topScorerLocked}
            submittedEditHint={t("predictions.submittedEditHint")}
            submittedLockedHint={t("predictions.submittedLockedHint")}
          />
        </label>

        {gameMode === "match_scores" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">
              {locale === "he" ? "זוכת המונדיאל" : "World Cup winner"}
            </span>
            <div className="flex gap-2">
              <select
                value={winner}
                onChange={(event) => setWinner(event.target.value)}
                disabled={winnerLocked || winnerReadOnly}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{locale === "he" ? "בחר קבוצה" : "Choose team"}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {getTeamName(team, locale)}
                  </option>
                ))}
              </select>
              <BonusActionButtons
                saving={saving}
                saveKey="winner"
                submitted={submitted.winner}
                readOnly={winnerReadOnly}
                editing={editing.winner}
                locked={winnerLocked}
                disabled={!winner}
                saveLabel={t("common.save")}
                savedLabel={t("common.saved")}
                savingLabel={t("common.saving")}
                editLabel={t("common.edit")}
                onSave={() => void save({ type: "tournament_winner", teamId: winner }, "winner")}
                onEdit={() => edit("winner")}
              />
            </div>
            <BonusSubmittedHint
              submitted={submitted.winner}
              readOnly={winnerReadOnly}
              locked={winnerLocked}
              submittedEditHint={t("predictions.submittedEditHint")}
              submittedLockedHint={t("predictions.submittedLockedHint")}
            />
          </label>
        ) : null}
      </div>

      {(message || error) && (
        <div
          className={
            "mt-4 rounded-lg border px-3 py-2 text-sm " +
            (error
              ? "border-[var(--color-danger)] bg-[var(--color-danger)]/10"
              : "border-[var(--color-accent)] bg-[var(--color-accent)]/10")
          }
        >
          {error ?? message}
        </div>
      )}
    </section>
  );
}

function BonusActionButtons({
  saving,
  saveKey,
  submitted,
  readOnly,
  editing,
  locked,
  disabled,
  saveLabel,
  savedLabel,
  savingLabel,
  editLabel,
  onSave,
  onEdit,
}: {
  saving: string | null;
  saveKey: "top_scorer" | "winner";
  submitted: boolean;
  readOnly: boolean;
  editing: boolean;
  locked: boolean;
  disabled: boolean;
  saveLabel: string;
  savedLabel: string;
  savingLabel: string;
  editLabel: string;
  onSave: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={saving !== null || disabled || locked || readOnly}
        onClick={onSave}
        className="rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving === saveKey ? savingLabel : readOnly ? savedLabel : saveLabel}
      </button>
      {submitted ? (
        <button
          type="button"
          disabled={saving !== null || locked || editing}
          onClick={onEdit}
          className="rounded-lg border border-white/15 px-4 py-3 text-sm font-bold text-[var(--color-gold)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {editLabel}
        </button>
      ) : null}
    </div>
  );
}

function BonusSubmittedHint({
  submitted,
  readOnly,
  locked,
  submittedEditHint,
  submittedLockedHint,
}: {
  submitted: boolean;
  readOnly: boolean;
  locked: boolean;
  submittedEditHint: string;
  submittedLockedHint: string;
}) {
  if (!submitted || !readOnly) return null;
  return (
    <p className="mt-2 text-xs font-semibold text-[var(--color-accent)]">
      {locked ? submittedLockedHint : submittedEditHint}
    </p>
  );
}
