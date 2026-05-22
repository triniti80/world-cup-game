"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Dashboard", short: "Home" },
  { href: "/leagues", label: "Leagues", short: "League" },
  { href: "/fixtures", label: "Fixtures", short: "Games" },
  { href: "/predictions", label: "Predictions", short: "Picks" },
  { href: "/bracket", label: "Bracket", short: "Bracket" },
  { href: "/leaderboard", label: "Leaderboard", short: "Table" },
  { href: "/instructions", label: "How to Play", short: "Rules" },
  { href: "/settings", label: "Settings", short: "Admin" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between rounded-xl border border-white/10 bg-[var(--color-panel)]/95 p-1 text-xs backdrop-blur-md md:static md:inset-auto md:justify-end md:gap-1 md:border-0 md:bg-transparent md:p-0 md:text-sm md:backdrop-blur-0">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              "rounded-lg px-2 py-2 text-center font-semibold transition active:scale-95 md:px-3 md:py-1.5 " +
              (active
                ? "bg-[var(--color-accent)] text-[#102000] glow-lime"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-panel-high)] hover:text-[var(--color-fg)]")
            }
          >
            <span className="md:hidden">{t.short}</span>
            <span className="hidden md:inline">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
