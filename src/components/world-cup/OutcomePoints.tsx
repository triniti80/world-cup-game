import { t, type Locale } from "@/lib/i18n";
import {
  BASE_EXACT_SCORE_POINTS,
  getCorrectOutcomePoints,
  isOddsScoredGroupMatch,
  ODDS_EXACT_SCORE_BONUS,
} from "@/lib/world-cup/static-odds";

type OutcomePointsProps = {
  matchNumber: number;
  locale?: Locale;
  showExactHint?: boolean;
};

export function OutcomePoints({
  matchNumber,
  locale = "en",
  showExactHint = false,
}: OutcomePointsProps) {
  const values = [
    ["H", getCorrectOutcomePoints(matchNumber, "home")],
    ["D", getCorrectOutcomePoints(matchNumber, "draw")],
    ["A", getCorrectOutcomePoints(matchNumber, "away")],
  ] as const;
  const exactHint = isOddsScoredGroupMatch(matchNumber)
    ? `+${formatPointValue(ODDS_EXACT_SCORE_BONUS)} ${locale === "he" ? "מדויק" : "exact"}`
    : `${formatPointValue(BASE_EXACT_SCORE_POINTS)} ${locale === "he" ? "מדויק" : "exact"}`;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--color-fg-muted)]">
      <span className="uppercase">{locale === "he" ? "ניקוד" : "Points"}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map(([label, points]) => (
          <span
            key={label}
            className="rounded-full border border-white/10 bg-[var(--color-panel-high)] px-2 py-1 text-[var(--color-fg)]"
          >
            {label} {formatPointValue(points)}
          </span>
        ))}
      </div>
      {showExactHint ? (
        <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-1 text-[var(--color-gold)]">
          {exactHint}
        </span>
      ) : null}
      <span className="sr-only">{t(locale, "common.points")}</span>
    </div>
  );
}

export function formatPointValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
