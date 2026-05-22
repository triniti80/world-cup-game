import Link from "next/link";
import { BonusPredictionForm } from "@/components/BonusPredictionForm";
import { PredictionsTabs } from "@/components/PredictionsTabs";
import { StagePredictionForm } from "@/components/StagePredictionForm";
import { matches } from "@/lib/world-cup/data";
import { readSession } from "@/lib/session";
import {
  getCurrentLeague,
  getSavedBonusPredictions,
  getSavedMatchPredictions,
  getSavedStagePredictions,
} from "@/lib/world-cup/repository";

export default async function PredictionsPage() {
  const session = await readSession();
  const currentLeague = session ? await getCurrentLeague(session.userId) : null;
  const savedPredictions = session ? await getSavedMatchPredictions(session.userId) : {};
  const savedBonusPredictions = session ? await getSavedBonusPredictions(session.userId) : {};
  const savedStagePredictions = session ? await getSavedStagePredictions(session.userId) : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">My Predictions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          Predictions shown here follow your active league's game option.
        </p>
      </div>

      {!currentLeague ? (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold">No active league</h2>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            Create or join a league before making predictions.
          </p>
          <Link
            href="/leagues"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime"
          >
            Go to Leagues
          </Link>
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
            <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
              Active league
            </div>
            <div className="mt-1 font-display text-lg font-bold">{currentLeague.leagueName}</div>
            <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
              {currentLeague.gameMode === "match_scores"
                ? "Match score guessing"
                : "Pre-tournament stage prediction"}
            </div>
          </section>

          <BonusPredictionForm
            gameMode={currentLeague.gameMode}
            initialPredictions={savedBonusPredictions}
          />

          {currentLeague.gameMode === "match_scores" ? (
            <PredictionsTabs matches={matches} initialPredictions={savedPredictions} />
          ) : (
            <StagePredictionForm initialPredictions={savedStagePredictions} />
          )}
        </>
      )}
    </div>
  );
}
