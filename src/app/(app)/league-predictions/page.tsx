import Link from "next/link";
import { readActiveLeagueId, readSession } from "@/lib/session";
import {
  formatKickoff,
  getMatchName,
  getTeam,
  stageLabel,
} from "@/lib/world-cup/data";
import { getLeaguePredictionVisibility } from "@/lib/world-cup/repository";

export default async function LeaguePredictionsPage() {
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const { league, members, matches, bonuses } = session
    ? await getLeaguePredictionVisibility(session.userId, activeLeagueId)
    : { league: null, members: [], matches: [], bonuses: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">League Predictions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          See who has submitted picks. Scores are hidden until each match starts;
          pre-tournament bonus picks reveal after the first match starts.
        </p>
      </div>

      {!league ? (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold">No active league</h2>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            Create or join a league before viewing predictions.
          </p>
          <Link
            href="/leagues"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime"
          >
            Go to Leagues
          </Link>
        </div>
      ) : (
        <section className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
          <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">Active league</div>
          <div className="mt-1 font-display text-lg font-bold">{league.leagueName}</div>
          <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {league.gameMode === "match_scores"
              ? "Match score guessing"
              : "Pre-tournament stage prediction"}
          </div>
        </section>
      )}

      {league ? (
        <>
          <section className="glass-card rounded-xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Bonus Picks</h2>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  Hidden until the first tournament match starts.
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-gold)]/15 px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
                100 pts each
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {members.map((member) => {
                const bonus = bonuses.find((row) => row.userId === member.userId);
                return (
                  <article
                    key={member.userId}
                    className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4"
                  >
                    <h3 className="font-display text-base font-bold">{member.name}</h3>
                    <div className="mt-3 grid gap-2 text-sm">
                      <VisibilityRow
                        label="Top scorer"
                        submitted={Boolean(bonus?.topScorerSubmitted)}
                        revealed={Boolean(bonus?.topScorerRevealed)}
                        value={bonus?.topScorer}
                      />
                      {league.gameMode === "match_scores" ? (
                        <VisibilityRow
                          label="Champion"
                          submitted={Boolean(bonus?.winnerSubmitted)}
                          revealed={Boolean(bonus?.winnerRevealed)}
                          value={getTeam(bonus?.winnerTeamId)?.name}
                        />
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {league.gameMode === "match_scores" ? (
            <section className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Match Score Picks</h2>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  Before kickoff, only submission status is visible.
                </p>
              </div>
              {matches.map((match) => (
                <article key={match.dbId} className="glass-card rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                        Match {match.number} · {stageLabel(match.stage)}
                        {match.group ? ` · Group ${match.group}` : ""}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-bold">{getMatchName(match)}</h3>
                      <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                        {formatKickoff(match.kickoffAtUtc)}
                      </p>
                    </div>
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-bold " +
                        (match.revealed
                          ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                          : "bg-[var(--color-panel-highest)] text-[var(--color-fg-muted)]")
                      }
                    >
                      {match.revealed ? "Revealed" : "Hidden"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {members.map((member) => {
                      const prediction = match.predictions.find((row) => row.userId === member.userId);
                      return (
                        <div
                          key={member.userId}
                          className="rounded-lg border border-white/10 bg-[var(--color-panel-low)] px-3 py-2"
                        >
                          <div className="text-sm font-bold">{member.name}</div>
                          <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
                            {!prediction?.submitted
                              ? "Missing"
                              : prediction.revealed
                                ? `${prediction.homeScore} - ${prediction.awayScore}`
                                : "Submitted"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="glass-card rounded-xl p-5">
              <h2 className="font-display text-xl font-bold">Stage Picks</h2>
              <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                Stage-pick reveal details will be added when the full 48-team tournament data is imported.
                Bonus-pick visibility is already enforced above.
              </p>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

function VisibilityRow({
  label,
  submitted,
  revealed,
  value,
}: {
  label: string;
  submitted: boolean;
  revealed: boolean;
  value?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-panel-highest)] px-3 py-2">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className="font-bold text-[var(--color-accent)]">
        {!submitted ? "Missing" : revealed ? value ?? "Submitted" : "Submitted"}
      </span>
    </div>
  );
}
