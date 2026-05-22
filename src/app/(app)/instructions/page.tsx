import Link from "next/link";

const sections = [
  {
    title: "1. Join the league",
    body: "Create your account, log in, and join the private league. The first registered player becomes the admin for the friend group.",
  },
  {
    title: "2. Guess match scores",
    body: "Go to My Predictions and enter the score for each game. A score guess locks 5 minutes before that match starts.",
  },
  {
    title: "3. Pick qualifiers and bracket winners",
    body: "Your group-stage scores calculate predicted tables and Round of 32 qualifiers. Before the tournament starts, you can adjust qualifiers and complete your knockout bracket.",
  },
  {
    title: "4. Keep guesses private until reveal",
    body: "Other players cannot see your qualifier picks before the first game starts. They cannot see a match score guess until that specific match starts.",
  },
  {
    title: "5. Score points",
    body: "Correct winner or draw is worth 2 points. Exact score is worth 5 points total. Correct stage qualifiers score more as the tournament gets deeper.",
  },
  {
    title: "6. Watch the standings",
    body: "The leaderboard shows total points and a breakdown by exact scores, result picks, and stage picks after real results are entered.",
  },
];

export default function InstructionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">How to Play</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          A quick guide for the friend pool. The rules are simple: make your picks
          before they lock, then enjoy watching everyone else's guesses appear as
          the games begin.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <section
            key={section.title}
            className="glass-card rounded-xl p-5"
          >
            <h2 className="font-display text-lg font-bold text-[var(--color-primary)]">
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-fg-muted)]">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-[var(--color-gold)]/50 bg-[var(--color-panel-low)] p-5 glow-gold">
        <h2 className="font-display text-lg font-bold">Useful pages</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {([
            ["/predictions", "My Predictions"],
            ["/fixtures", "Fixtures"],
            ["/bracket", "Bracket"],
            ["/leaderboard", "Leaderboard"],
          ] as const).map(([href, label]) => (
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
