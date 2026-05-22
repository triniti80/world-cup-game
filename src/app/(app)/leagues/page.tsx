import { LeagueForms } from "@/components/LeagueForms";
import { LeagueList } from "@/components/LeagueList";
import { readActiveLeagueId, readSession } from "@/lib/session";
import { getCurrentLeague, getUserLeagues } from "@/lib/world-cup/repository";

export default async function LeaguesPage() {
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const leagues = session ? await getUserLeagues(session.userId) : [];
  const currentLeague = session ? await getCurrentLeague(session.userId, activeLeagueId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Leagues</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          Create a private league, choose the game option, or join one with an invite code.
        </p>
      </div>

      <LeagueForms />

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Your Leagues</h2>
        <LeagueList leagues={leagues} activeLeagueId={currentLeague?.leagueId ?? null} />
      </section>
    </div>
  );
}
