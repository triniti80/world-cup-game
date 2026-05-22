import { getTeam } from "@/lib/world-cup/data";

const COLORS: Record<string, string> = {
  canada: "from-red-500 to-white",
  mexico: "from-green-500 via-white to-red-500",
  "south-africa": "from-green-500 via-yellow-400 to-blue-600",
  qatar: "from-red-900 to-white",
  usa: "from-blue-700 via-white to-red-600",
  brazil: "from-green-500 via-yellow-300 to-blue-600",
  japan: "from-white to-red-500",
  morocco: "from-red-700 to-green-500",
  argentina: "from-sky-400 via-white to-sky-400",
  france: "from-blue-700 via-white to-red-600",
  senegal: "from-green-500 via-yellow-300 to-red-500",
  australia: "from-blue-700 to-yellow-300",
};

export function TeamBadge({
  teamId,
  label,
  size = "md",
}: {
  teamId?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const team = getTeam(teamId);
  const code = team?.code ?? label?.slice(0, 3).toUpperCase() ?? "TBD";
  const name = team?.name ?? label ?? "TBD";
  const badgeSize = size === "lg" ? "h-16 w-16 text-base" : size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm";

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div
        className={`${badgeSize} flex shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-br ${
          COLORS[team?.id ?? ""] ?? "from-[var(--color-panel-highest)] to-[var(--color-panel-low)]"
        } font-display font-extrabold text-[#081425] shadow-lg`}
      >
        {code}
      </div>
      <div className="max-w-28 truncate text-xs font-semibold text-[var(--color-fg)]">{name}</div>
    </div>
  );
}
