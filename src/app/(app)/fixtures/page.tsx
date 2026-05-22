import { MatchCard } from "@/components/world-cup/MatchCard";
import { matches, stageLabel } from "@/lib/world-cup/data";

export default function FixturesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Fixtures</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          Seed fixtures for the first implementation pass. Admin import/editing will
          replace these with the full official World Cup schedule.
        </p>
      </div>

      <section className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {["10", "11", "12", "13", "14", "15"].map((day) => (
          <button
            key={day}
            className={
              "flex h-20 min-w-16 flex-col items-center justify-center rounded-xl font-bold transition active:scale-95 " +
              (day === "11"
                ? "bg-[var(--color-accent)] text-[#102000] glow-lime"
                : "bg-[var(--color-panel-highest)] text-[var(--color-fg-muted)] hover:bg-[var(--color-panel-high)]")
            }
          >
            <span className="text-xs">JUN</span>
            <span className="font-display text-2xl font-extrabold">{day}</span>
          </button>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        {["All", "My Picks", "Live", "Group Stage", "Knockout"].map((filter, index) => (
          <button
            key={filter}
            className={
              "rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 " +
              (index === 0
                ? "border border-[var(--color-accent)] bg-[var(--color-panel-highest)] text-[var(--color-accent)]"
                : "bg-[var(--color-panel-low)] text-[var(--color-fg-muted)] hover:bg-[var(--color-panel-high)]")
            }
          >
            {filter}
          </button>
        ))}
      </section>

      <div className="space-y-8">
        {["A", "B", "C"].map((group) => {
          const groupMatches = matches.filter((match) => match.group === group);
          if (groupMatches.length === 0) return null;
          return (
            <section key={group} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[var(--color-primary)]">
                  <span className="h-6 w-1 rounded-full bg-[var(--color-accent)]" />
                  Group {group}
                </h2>
                <span className="rounded-full bg-[var(--color-panel-high)] px-3 py-1 text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                  {stageLabel("group")}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {groupMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          );
        })}

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-6 w-1 rounded-full bg-[var(--color-gold)]" />
            <h2 className="font-display text-xl font-bold text-[var(--color-primary)]">
              Knockout placeholders
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {matches
              .filter((match) => match.stage !== "group")
              .map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
