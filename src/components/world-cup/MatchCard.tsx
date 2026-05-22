import {
  formatKickoff,
  getMatchLockAt,
  getMatchName,
  stageLabel,
  type Match,
} from "@/lib/world-cup/data";
import { TeamBadge } from "./TeamBadge";

export function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const lockAt = getMatchLockAt(match);

  return (
    <article className="glass-card rounded-xl p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
            Match {match.number} · {stageLabel(match.stage)}
            {match.group ? ` · Group ${match.group}` : ""}
          </div>
          <h3 className="mt-1 font-display text-lg font-bold text-[var(--color-fg)]">
            {getMatchName(match)}
          </h3>
        </div>
        <span className="rounded-full bg-[var(--color-panel-highest)] px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
          {match.status}
        </span>
      </div>

      {!compact && (
        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamBadge teamId={match.homeTeamId} label={match.homePlaceholder} />
          <div className="font-display text-2xl font-extrabold text-[var(--color-fg-muted)]">VS</div>
          <TeamBadge teamId={match.awayTeamId} label={match.awayPlaceholder} />
        </div>
      )}

      <div className="grid gap-2 text-sm text-[var(--color-fg-muted)]">
        <div className="flex justify-between gap-3">
          <span>Kickoff</span>
          <span className="text-right font-semibold text-[var(--color-fg)]">
            {formatKickoff(match.kickoffAtUtc)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Prediction lock</span>
          <span className="text-right font-semibold text-[var(--color-danger)]">
            {formatKickoff(lockAt.toISOString())}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Venue</span>
          <span className="max-w-52 text-right">{match.venue}</span>
        </div>
      </div>
    </article>
  );
}
