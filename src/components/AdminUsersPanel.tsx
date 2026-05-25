"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminLeagueRow, AdminUserRow } from "@/lib/world-cup/repository";

export function AdminUsersPanel({
  users,
  leagues,
  currentUserId,
}: {
  users: AdminUserRow[];
  leagues: AdminLeagueRow[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setAccess(user: AdminUserRow, isEnabled: boolean) {
    const disabledReason =
      isEnabled || user.isEnabled === false
        ? null
        : window.prompt("Reason for disabling this user?", "Disabled by admin");
    if (!isEnabled && disabledReason === null) return;

    setBusyUserId(user.id);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: user.id, isEnabled, disabledReason }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Could not update user." }));
      setError(body.error ?? "Could not update user.");
      setBusyUserId(null);
      return;
    }
    router.refresh();
    setBusyUserId(null);
  }

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-xl p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold">Registered users</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Enable or disable access to the pool. Disabled users cannot log in, and
            already signed-in disabled users see an access-disabled screen.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {users.map((user) => (
            <article
              key={user.id}
              className="grid gap-4 rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold">{user.name}</h3>
                  <span
                    className={
                      "rounded-full px-3 py-1 text-xs font-bold uppercase " +
                      (user.role === "admin"
                        ? "border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                        : "bg-[var(--color-panel-highest)] text-[var(--color-fg-muted)]")
                    }
                  >
                    {user.role}
                  </span>
                  <span
                    className={
                      "rounded-full px-3 py-1 text-xs font-bold uppercase " +
                      (user.isEnabled
                        ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                        : "bg-[var(--color-danger)]/15 text-[var(--color-danger)]")
                    }
                  >
                    {user.isEnabled ? "enabled" : "disabled"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-fg-muted)]">
                  <span>{user.email}</span>
                  <span>{user.leagueCount} leagues</span>
                  <span>joined {formatDate(user.createdAt)}</span>
                  {user.disabledReason ? <span>reason: {user.disabledReason}</span> : null}
                </div>
              </div>

              <div className="flex items-center gap-2 md:justify-end">
                <button
                  type="button"
                  disabled={busyUserId !== null || user.id === currentUserId || !user.isEnabled}
                  onClick={() => setAccess(user, false)}
                  className="rounded-lg border border-[var(--color-danger)]/40 px-3 py-2 text-sm font-bold text-[var(--color-danger)] disabled:opacity-40"
                >
                  Disable
                </button>
                <button
                  type="button"
                  disabled={busyUserId !== null || user.isEnabled}
                  onClick={() => setAccess(user, true)}
                  className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-bold text-[#102000] disabled:opacity-40"
                >
                  Enable
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-xl p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold">Leagues</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Overview of all leagues, invite codes, game modes, creators, and member counts.
          </p>
        </div>

        <div className="grid gap-3">
          {leagues.map((league) => (
            <article
              key={league.id}
              className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <h3 className="font-display text-lg font-bold">{league.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-fg-muted)]">
                    <span>Invite: {league.inviteCode}</span>
                    <span>{league.gameMode === "match_scores" ? "Score game" : "Stage game"}</span>
                    <span>Creator: {league.creatorName ?? "unknown"}</span>
                    <span>Created {formatDate(league.createdAt)}</span>
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--color-panel-highest)] px-4 py-3 text-end">
                  <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                    Members
                  </div>
                  <div className="font-display text-xl font-extrabold text-[var(--color-accent)]">
                    {league.memberCount}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
