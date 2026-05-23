import { FixturesBrowser } from "@/components/FixturesBrowser";
import { readActiveLeagueId, readSession } from "@/lib/session";
import { getSavedMatchPredictions, getSeededMatchesWithResults } from "@/lib/world-cup/repository";

export default async function FixturesPage() {
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const matches = await getSeededMatchesWithResults();
  const savedPredictions = session
    ? await getSavedMatchPredictions(session.userId, activeLeagueId)
    : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Fixtures</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          Imported tournament fixtures. Admins can correct teams, kickoff times,
          venues, and knockout placeholders from Settings.
        </p>
      </div>

      <FixturesBrowser matches={matches} savedPredictions={savedPredictions} />
    </div>
  );
}
