import type { ReactNode } from "react";
import Link from "next/link";
import { AppNav } from "./AppNav";
import { LogoutButton } from "./LogoutButton";
import { ProfileAvatar } from "./ProfileAvatar";

export function AppShell({
  children,
  user,
  activeLeagueName,
  activeLeagueMode,
}: {
  children: ReactNode;
  user?: {
    name: string;
    email: string;
    role: "user" | "admin";
  };
  activeLeagueName?: string;
  activeLeagueMode?: "stage_predictions" | "match_scores";
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-24 md:pb-0">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--color-panel)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="rounded-full transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)] active:scale-95"
              aria-label="Open profile"
              title="Open profile"
            >
              <ProfileAvatar name={user?.name} email={user?.email} size="sm" />
            </Link>
            <div>
              <div className="font-display text-lg font-extrabold text-[var(--color-primary)]">
                WC2026
              </div>
              <div className="text-xs font-semibold uppercase text-[var(--color-fg-muted)]">
                {activeLeagueName ?? "No active league"}
              </div>
              {activeLeagueMode ? (
                <div className="hidden text-[10px] font-semibold uppercase text-[var(--color-gold)] md:block">
                  {activeLeagueMode === "match_scores" ? "Score game" : "Stage game"}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AppNav />
            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
