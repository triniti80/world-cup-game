import Link from "next/link";
import { BonusPredictionForm } from "@/components/BonusPredictionForm";
import { PredictionsTabs } from "@/components/PredictionsTabs";
import { StagePredictionForm } from "@/components/StagePredictionForm";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import { readActiveLeagueId, readSession } from "@/lib/session";
import {
  ensureSeedTournament,
  getBonusPredictionLockAt,
  getCurrentLeague,
  getKnockoutStageLockAt,
  getPreTournamentLockAt,
  getSavedBonusPredictions,
  getSavedMatchPredictions,
  getSavedStagePredictions,
  getSeededMatchesWithResults,
} from "@/lib/world-cup/repository";

export default async function PredictionsPage() {
  const locale = await readLocale();
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const currentLeague = session ? await getCurrentLeague(session.userId, activeLeagueId) : null;
  const shouldLoadMatchScores = Boolean(session && currentLeague?.gameMode === "match_scores");
  const shouldLoadStages = Boolean(session && currentLeague?.gameMode === "stage_predictions");
  const shouldLoadBonus = Boolean(session && currentLeague);
  const [
    savedPredictions,
    savedBonusPredictions,
    savedStagePredictions,
    matches,
    stageLockState,
    bonusLockState,
  ] =
    await Promise.all([
      shouldLoadMatchScores ? getSavedMatchPredictions(session!.userId, activeLeagueId) : {},
      shouldLoadBonus ? getSavedBonusPredictions(session!.userId, activeLeagueId) : {},
      shouldLoadStages
        ? getSavedStagePredictions(session!.userId, activeLeagueId)
        : { teams: {}, r32Ranks: {} },
      shouldLoadMatchScores || shouldLoadStages ? getSeededMatchesWithResults() : [],
      shouldLoadStages ? getStageLockState() : { r32: false, knockout: false },
      shouldLoadBonus ? getBonusLockState() : { top_scorer: false, winner: false },
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t(locale, "predictions.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          {t(locale, "predictions.body")}
        </p>
      </div>

      {!currentLeague ? (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold">{t(locale, "common.noActiveLeague")}</h2>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            {t(locale, "predictions.noLeagueBody")}
          </p>
          <Link
            href="/leagues"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime"
          >
            {t(locale, "common.goToLeagues")}
          </Link>
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
            <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
              {t(locale, "common.activeLeague")}
            </div>
            <div className="mt-1 font-display text-lg font-bold">{currentLeague.leagueName}</div>
            <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
              {currentLeague.gameMode === "match_scores"
                ? t(locale, "app.matchScores")
                : t(locale, "app.stagePredictions")}
            </div>
          </section>

          <BonusPredictionForm
            gameMode={currentLeague.gameMode}
            initialPredictions={savedBonusPredictions}
            locked={bonusLockState}
          />

          {currentLeague.gameMode === "match_scores" ? (
            <PredictionsTabs matches={matches} initialPredictions={savedPredictions} />
          ) : (
            <StagePredictionForm
              initialPredictions={savedStagePredictions}
              lockedStages={stageLockState}
              matches={matches}
            />
          )}
        </>
      )}
    </div>
  );
}

async function getStageLockState(): Promise<{ r32: boolean; knockout: boolean }> {
  const tournament = await ensureSeedTournament();
  const now = Date.now();
  return {
    r32: now >= getPreTournamentLockAt(tournament).getTime(),
    knockout: now >= (await getKnockoutStageLockAt(tournament.id)).getTime(),
  };
}

async function getBonusLockState(): Promise<{ top_scorer: boolean; winner: boolean }> {
  const tournament = await ensureSeedTournament();
  const now = Date.now();
  return {
    top_scorer: now >= getBonusPredictionLockAt(tournament, "top_scorer").getTime(),
    winner: now >= getBonusPredictionLockAt(tournament, "tournament_winner").getTime(),
  };
}
