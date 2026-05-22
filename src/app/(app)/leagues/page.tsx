import { LeagueForms } from "@/components/LeagueForms";
import { readSession } from "@/lib/session";
import { getUserLeagues } from "@/lib/world-cup/repository";

const gameModeLabels = {
  stage_predictions: "Pre-tournament stage prediction",
  match_scores: "Match score guessing",
};

export default async function LeaguesPage() {
  const session = await readSession();
  const leagues = session ? await getUserLeagues(session.userId) : [];

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
        {leagues.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
            You are not in a league yet.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {leagues.map((league, index) => (
              <article
                key={league.leagueId}
                className="glass-card rounded-xl p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold">{league.leagueName}</h3>
                    <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                      {gameModeLabels[league.gameMode]}
                    </p>
                  </div>
                  {index === 0 ? (
                    <span className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                      Active
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 rounded-lg bg-[var(--color-panel-highest)] px-3 py-2 text-sm">
                  Invite code: <span className="font-bold text-[var(--color-gold)]">{league.inviteCode}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
