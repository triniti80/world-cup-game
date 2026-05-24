import { getTeam, getTeamName } from "@/lib/world-cup/data";
import type { Locale } from "@/lib/i18n";

export function TeamBadge({
  teamId,
  label,
  size = "md",
  locale = "en",
}: {
  teamId?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  locale?: Locale;
}) {
  const team = getTeam(teamId);
  const code = team?.code ?? label?.slice(0, 3).toUpperCase() ?? "TBD";
  const name = getTeamName(team, locale) ?? label ?? "TBD";
  const badgeSize = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const flagSize = size === "lg" ? "text-5xl" : size === "sm" ? "text-3xl" : "text-4xl";

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div
        className={`${badgeSize} flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-[var(--color-panel-highest)] shadow-lg`}
        title={`${name} (${code})`}
      >
        {team?.flag ? (
          <span aria-label={`${name} flag`} className={`${flagSize} leading-none`} role="img">
            {team.flag}
          </span>
        ) : (
          <span className="font-display text-xs font-extrabold text-[var(--color-accent)]">{code}</span>
        )}
      </div>
      <div className="max-w-28 truncate text-xs font-semibold text-[var(--color-fg)]">{name}</div>
    </div>
  );
}
