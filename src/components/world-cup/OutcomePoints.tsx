import { t, type Locale } from "@/lib/i18n";
import {
  BASE_EXACT_SCORE_POINTS,
  getCorrectOutcomePoints,
  isOddsScoredMatch,
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
  const homePoints = getCorrectOutcomePoints(matchNumber, "home");
  const drawPoints = getCorrectOutcomePoints(matchNumber, "draw");
  const awayPoints = getCorrectOutcomePoints(matchNumber, "away");
  const exactHint = isOddsScoredMatch(matchNumber)
    ? `+${formatPointValue(ODDS_EXACT_SCORE_BONUS)} ${locale === "he" ? "מדויק" : "exact"}`
    : `${formatPointValue(BASE_EXACT_SCORE_POINTS)} ${locale === "he" ? "מדויק" : "exact"}`;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-2">
        <PointValue value={homePoints} />
        <PointValue value={drawPoints} emphasized />
        <PointValue value={awayPoints} />
      </div>
      {showExactHint ? (
        <div className="text-center text-xs font-bold text-[var(--color-gold)]">
          {exactHint}
        </div>
      ) : null}
      <span className="sr-only">
        {t(locale, "common.points")}: home win {formatPointValue(homePoints)}, draw{" "}
        {formatPointValue(drawPoints)}, away win {formatPointValue(awayPoints)}
      </span>
    </div>
  );
}

function PointValue({ value, emphasized = false }: { value: number; emphasized?: boolean }) {
  return (
    <div
      className={
        "mx-auto min-w-14 rounded-lg px-3 py-1.5 text-center font-display text-lg font-extrabold " +
        (emphasized
          ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
          : "bg-[var(--color-accent)]/15 text-[var(--color-accent)]")
      }
    >
      {formatPointValue(value)}
    </div>
  );
}

export function formatPointValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
