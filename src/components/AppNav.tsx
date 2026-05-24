"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18nProvider";

const TABS = [
  { href: "/dashboard", labelKey: "nav.dashboard", shortKey: "nav.dashboardShort" },
  { href: "/leagues", labelKey: "nav.leagues", shortKey: "nav.leaguesShort" },
  { href: "/fixtures", labelKey: "nav.fixtures", shortKey: "nav.fixturesShort" },
  { href: "/predictions", labelKey: "nav.predictions", shortKey: "nav.predictionsShort" },
  { href: "/league-predictions", labelKey: "nav.leaguePredictions", shortKey: "nav.leaguePredictions" },
  { href: "/bracket", labelKey: "nav.bracket", shortKey: "nav.bracket" },
  { href: "/leaderboard", labelKey: "nav.leaderboard", shortKey: "nav.leaderboardShort" },
  { href: "/instructions", labelKey: "nav.instructions", shortKey: "nav.instructionsShort" },
  { href: "/settings", labelKey: "nav.settings", shortKey: "nav.settingsShort" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between rounded-xl border border-white/10 bg-[var(--color-panel)]/95 p-1 text-xs backdrop-blur-md md:static md:inset-auto md:justify-end md:gap-1 md:border-0 md:bg-transparent md:p-0 md:text-sm md:backdrop-blur-0">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              "rounded-lg px-2 py-2 text-center font-semibold transition active:scale-95 md:px-3 md:py-1.5 " +
              (active
                ? "bg-[var(--color-accent)] text-[#102000] glow-lime"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-panel-high)] hover:text-[var(--color-fg)]")
            }
          >
            <span className="md:hidden">{t(tab.shortKey)}</span>
            <span className="hidden md:inline">{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
