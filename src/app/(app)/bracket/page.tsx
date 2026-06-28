import { BracketViewer } from "@/components/BracketViewer";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import { readActiveLeagueId, readSession } from "@/lib/session";
import {
  getLeaguePredictionVisibility,
  getSeededMatchesWithResults,
} from "@/lib/world-cup/repository";

export default async function BracketPage() {
  const locale = await readLocale();
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const matches = await getSeededMatchesWithResults();
  const predictionVisibility = session
    ? await getLeaguePredictionVisibility(session.userId, activeLeagueId)
    : { league: null, members: [], stagePredictions: [] };
  const hasStageLeague = predictionVisibility.league?.gameMode === "stage_predictions";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t(locale, "nav.bracket")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          {locale === "he"
            ? "בחר תוצאות חיות או משתתף כדי לראות איך הבראקט מתקדם לפי הבחירות שלו."
            : "Choose live results or a participant to see the bracket filled from that path."}
        </p>
      </div>

      <BracketViewer
        locale={locale}
        matches={matches}
        members={hasStageLeague ? predictionVisibility.members : []}
        stages={hasStageLeague ? predictionVisibility.stagePredictions : []}
      />
    </div>
  );
}
