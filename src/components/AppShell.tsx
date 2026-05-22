import type { ReactNode } from "react";
import { AppNav } from "./AppNav";
import { LogoutButton } from "./LogoutButton";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-24 md:pb-0">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--color-panel)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--color-gold)] bg-[var(--color-panel-high)] font-display text-sm font-extrabold text-[var(--color-gold)]">
              26
            </div>
            <div>
              <div className="font-display text-lg font-extrabold text-[var(--color-primary)]">
                WC2026
              </div>
              <div className="text-xs font-semibold uppercase text-[var(--color-fg-muted)]">
                Friends Pool
              </div>
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
