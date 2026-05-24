import Link from "next/link";

const quickStart = [
  "Create an account or sign in.",
  "Create a league or join one with an invite code.",
  "Check the active league on My Predictions.",
  "Make the picks allowed by that league's game option before they lock.",
  "Follow League Picks and the Leaderboard as predictions reveal and scores are entered.",
];

const stageScores = [
  ["Round of 32", "10"],
  ["Round of 16", "20"],
  ["Quarter-finals", "40"],
  ["Semi-finals", "80"],
  ["Final", "120"],
  ["Champion", "150"],
] as const;

const usefulLinks = [
  ["/leagues", "Leagues"],
  ["/predictions", "My Predictions"],
  ["/fixtures", "Fixtures"],
  ["/league-predictions", "League Picks"],
  ["/leaderboard", "Leaderboard"],
] as const;

export default function InstructionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">How to Play</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-fg-muted)]">
          Each league chooses one game option: pre-tournament stage picks or match score
          guessing. Bonus picks, locks, visibility, and leaderboard points follow that
          league option.
        </p>
      </div>

      <section className="glass-card rounded-xl p-5">
        <h2 className="font-display text-xl font-bold text-[var(--color-primary)]">
          Quick Start
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-5">
          {quickStart.map((step, index) => (
            <li
              key={step}
              className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4"
            >
              <div className="font-display text-2xl font-extrabold text-[var(--color-accent)]">
                {index + 1}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-fg-muted)]">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-card rounded-xl p-5">
          <h2 className="font-display text-xl font-bold text-[var(--color-primary)]">
            Option 1: Stage Prediction League
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--color-fg-muted)]">
            <p>
              Before the World Cup starts, pick the teams you think will reach each
              tournament stage. For the Round of 32, choose 1st and 2nd place in every
              group, plus only 8 third-place teams.
            </p>
            <p>
              Later rounds are selected from your previous saved picks, so your bracket
              narrows from Round of 32 to Champion.
            </p>
            <p>
              This league option also includes a pre-tournament top scorer pick worth
              100 points if correct.
            </p>
          </div>
        </section>

        <section className="glass-card rounded-xl p-5">
          <h2 className="font-display text-xl font-bold text-[var(--color-primary)]">
            Option 2: Match Score League
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--color-fg-muted)]">
            <p>
              Enter a home and away score for each fixture before that match locks.
              Correct outcome earns 2 points. Exact score earns 5 points total.
            </p>
            <p>
              For knockout matches, a tied score must include the team you think
              advances after extra time or penalties.
            </p>
            <p>
              This league option also includes pre-tournament top scorer and World Cup
              winner picks. Each correct bonus is worth 100 points.
            </p>
          </div>
        </section>
      </div>

      <section className="glass-card rounded-xl p-5">
        <h2 className="font-display text-xl font-bold text-[var(--color-primary)]">
          Scoring
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
            <h3 className="font-display text-base font-bold">Match scores</h3>
            <div className="mt-3 divide-y divide-white/10 text-sm">
              <ScoreRow label="Correct winner or draw" value="2 pts" />
              <ScoreRow label="Exact score" value="5 pts total" />
              <ScoreRow label="Wrong outcome" value="0 pts" />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
            <h3 className="font-display text-base font-bold">Stage picks</h3>
            <div className="mt-3 divide-y divide-white/10 text-sm">
              {stageScores.map(([label, value]) => (
                <ScoreRow key={label} label={label} value={`${value} pts`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card rounded-xl p-5">
        <h2 className="font-display text-xl font-bold text-[var(--color-primary)]">
          Locks and Visibility
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <RuleCard
            title="Pre-tournament picks"
            body="Stage picks, top scorer picks, and score-league winner picks lock 1 hour before Match 1."
          />
          <RuleCard
            title="Match scores"
            body="Each score prediction locks 5 minutes before that match starts."
          />
          <RuleCard
            title="Reveals"
            body="Score guesses reveal when the match starts. Pre-tournament picks reveal after the first match starts."
          />
        </div>
      </section>

      <section className="glass-card rounded-xl p-5">
        <h2 className="font-display text-xl font-bold text-[var(--color-primary)]">
          Leaderboard and Corrections
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <p className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm leading-6 text-[var(--color-fg-muted)]">
            The leaderboard is recalculated from saved score events after admins enter
            official match results, official stage teams, or official bonus winners.
            Expand a row to see the points breakdown.
          </p>
          <p className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm leading-6 text-[var(--color-fg-muted)]">
            If a fixture, kickoff time, venue, result, or official qualifier looks
            wrong, ask an admin to correct it in Settings. Admin changes are recorded
            in the audit log.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-gold)]/50 bg-[var(--color-panel-low)] p-5 glow-gold">
        <h2 className="font-display text-lg font-bold">Useful Pages</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {usefulLinks.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg bg-[var(--color-panel-highest)] px-4 py-2 font-bold text-[var(--color-gold)]"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className="text-right font-bold text-[var(--color-accent)]">{value}</span>
    </div>
  );
}

function RuleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
      <h3 className="font-display text-base font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--color-fg-muted)]">{body}</p>
    </div>
  );
}
