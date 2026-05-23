import Link from "next/link";
import { formatKickoff, tournament } from "@/lib/world-cup/data";
import { MatchCard } from "@/components/world-cup/MatchCard";
import { getSeededMatchesWithResults } from "@/lib/world-cup/repository";

export default async function DashboardPage() {
  const matches = await getSeededMatchesWithResults();
  const nextMatches = matches.slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="glass-card glow-gold relative overflow-hidden rounded-xl p-6 md:p-8">
        <div className="absolute right-6 top-4 font-display text-8xl font-extrabold text-white/5">
          26
        </div>
        <p className="text-sm font-bold uppercase text-[var(--color-gold)]">{tournament.name}</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold text-[var(--color-fg)] md:text-5xl">
          Friend pool command center
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)] md:text-base">
          Make score guesses, lock qualifier picks, and watch the table shift as
          matches begin. The interface now follows the Elite Tournament Pulse design
          system from the provided Stitch mockups.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/predictions"
            className="rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime active:scale-95"
          >
            Make Predictions
          </Link>
          <Link
            href="/instructions"
            className="rounded-lg border border-[var(--color-gold)] px-4 py-3 text-sm font-bold text-[var(--color-gold)] active:scale-95"
          >
            How to Play
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Qualifier picks lock" value={formatKickoff(tournament.qualifierLockAtUtc)} />
        <SummaryCard label="Score picks lock" value="5 min before kickoff" />
        <SummaryCard label="Guess visibility" value="Revealed after game starts" />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Next Up</h2>
            <p className="text-sm text-[var(--color-fg-muted)]">
              Enter scores before each match locks.
            </p>
          </div>
          <Link href="/fixtures" className="text-sm font-medium">
            All fixtures
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {nextMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div className="mt-2 font-display text-lg font-extrabold text-[var(--color-accent)]">
        {value}
      </div>
    </div>
  );
}
