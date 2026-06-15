"use client";

import { useRouter } from "next/navigation";
type LeaderboardSelectorProps = {
  selectedValue: string;
  allLabel: string;
  label: string;
  leagues: {
    leagueId: number;
    leagueName: string;
    gameModeLabel: string;
  }[];
};

export function LeaderboardSelector({
  selectedValue,
  allLabel,
  label,
  leagues,
}: LeaderboardSelectorProps) {
  const router = useRouter();

  return (
    <label className="block max-w-md">
      <span className="mb-1 block text-xs font-bold uppercase text-[var(--color-fg-muted)]">
        {label}
      </span>
      <select
        value={selectedValue}
        onChange={(event) => {
          router.push(`/leaderboard?league=${encodeURIComponent(event.target.value)}`);
        }}
        className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 text-sm font-semibold outline-none focus:border-[var(--color-accent)]"
      >
        <option value="all">{allLabel}</option>
        {leagues.map((league) => (
          <option key={league.leagueId} value={String(league.leagueId)}>
            {league.leagueName} · {league.gameModeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
