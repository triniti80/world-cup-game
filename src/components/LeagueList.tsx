"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { UserLeague } from "@/lib/world-cup/repository";

export function LeagueList({
  leagues,
  activeLeagueId,
  currentUserId,
  canAdminManage = false,
}: {
  leagues: UserLeague[];
  activeLeagueId: number | null;
  currentUserId: number;
  canAdminManage?: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [busyLeagueId, setBusyLeagueId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingLeagueId, setEditingLeagueId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [copiedLeagueId, setCopiedLeagueId] = useState<number | null>(null);

  async function activateLeague(leagueId: number) {
    setBusyLeagueId(leagueId);
    setError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "activate", leagueId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Server responded ${res.status}.`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.networkError"));
    } finally {
      setBusyLeagueId(null);
    }
  }

  async function renameLeague(league: UserLeague) {
    setBusyLeagueId(league.leagueId);
    setError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "rename",
          leagueId: league.leagueId,
          name: draftName,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Server responded ${res.status}.`);
        return;
      }
      setEditingLeagueId(null);
      setDraftName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.networkError"));
    } finally {
      setBusyLeagueId(null);
    }
  }

  async function deleteLeague(league: UserLeague) {
    const confirmed = window.confirm(
      `Delete "${league.leagueName}"? This removes the league, members, predictions, and leaderboard points for this league.`,
    );
    if (!confirmed) return;

    setBusyLeagueId(league.leagueId);
    setError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", leagueId: league.leagueId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Server responded ${res.status}.`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.networkError"));
    } finally {
      setBusyLeagueId(null);
    }
  }

  async function removeMember(league: UserLeague, member: UserLeague["members"][number]) {
    const confirmed = window.confirm(
      `Remove ${member.displayName} from "${league.leagueName}"? Their predictions and points in this league will be removed.`,
    );
    if (!confirmed) return;

    setBusyLeagueId(league.leagueId);
    setError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "remove_member",
          leagueId: league.leagueId,
          membershipId: member.membershipId,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Server responded ${res.status}.`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.networkError"));
    } finally {
      setBusyLeagueId(null);
    }
  }

  async function copyInviteUrl(league: UserLeague) {
    const url = `${window.location.origin}/invite/${encodeURIComponent(league.inviteCode)}`;
    await navigator.clipboard.writeText(url);
    setCopiedLeagueId(league.leagueId);
    window.setTimeout(() => setCopiedLeagueId(null), 1800);
  }

  if (leagues.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
        {t("leagues.none")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {leagues.map((league) => {
          const active = league.leagueId === activeLeagueId;
          const canManage = league.isOwner || canAdminManage;
          return (
            <article key={league.leagueId} className="glass-card rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {editingLeagueId === league.leagueId ? (
                    <input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-2 font-display text-lg font-bold outline-none focus:border-[var(--color-accent)]"
                    />
                  ) : (
                    <h3 className="font-display text-lg font-bold">{league.leagueName}</h3>
                  )}
                  <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                    {league.gameMode === "match_scores" ? t("app.matchScores") : t("app.stagePredictions")}
                  </p>
                </div>
                {active ? (
                  <span className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                    {t("leagues.active")}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busyLeagueId !== null}
                    onClick={() => void activateLeague(league.leagueId)}
                    className="rounded-lg bg-[var(--color-panel-highest)] px-3 py-2 text-xs font-bold text-[var(--color-gold)] transition hover:bg-[var(--color-panel-high)] disabled:opacity-60"
                  >
                    {busyLeagueId === league.leagueId ? t("leagues.switching") : t("leagues.setActive")}
                  </button>
                )}
              </div>
              <div className="mt-4 rounded-lg bg-[var(--color-panel-highest)] px-3 py-2 text-sm">
                {t("leagues.inviteCode")}:{" "}
                <span className="font-bold text-[var(--color-gold)]">{league.inviteCode}</span>
              </div>
              <details className="mt-3 rounded-lg border border-white/10 bg-[var(--color-panel-low)] p-3">
                <summary className="cursor-pointer list-none text-sm font-bold [&::-webkit-details-marker]:hidden">
                  Members ({league.members.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {league.members.map((member) => {
                    const isSelf = member.userId === currentUserId;
                    return (
                      <div
                        key={member.membershipId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--color-panel-highest)] px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-bold">{member.displayName}</span>
                          {member.userId === league.createdByUserId ? (
                            <span className="ms-2 text-xs font-bold text-[var(--color-gold)]">
                              manager
                            </span>
                          ) : null}
                          {isSelf ? (
                            <span className="ms-2 text-xs text-[var(--color-fg-muted)]">
                              you
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                            {member.total} {t("common.pts")}
                          </span>
                          {canManage ? (
                            <button
                              type="button"
                              disabled={busyLeagueId !== null || isSelf}
                              onClick={() => void removeMember(league, member)}
                              className="rounded-lg border border-[var(--color-danger)]/50 px-3 py-1.5 text-xs font-bold text-[var(--color-danger)] disabled:opacity-40"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyInviteUrl(league)}
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-[var(--color-gold)]"
                >
                  {copiedLeagueId === league.leagueId ? "Copied" : "Copy invite link"}
                </button>
                {canManage && editingLeagueId !== league.leagueId ? (
                  <>
                    <button
                      type="button"
                      disabled={busyLeagueId !== null}
                      onClick={() => {
                        setEditingLeagueId(league.leagueId);
                        setDraftName(league.leagueName);
                      }}
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold disabled:opacity-60"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      disabled={busyLeagueId !== null}
                      onClick={() => void deleteLeague(league)}
                      className="rounded-lg border border-[var(--color-danger)]/50 px-3 py-2 text-xs font-bold text-[var(--color-danger)] disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </>
                ) : null}
                {editingLeagueId === league.leagueId ? (
                  <>
                    <button
                      type="button"
                      disabled={busyLeagueId !== null || draftName.trim().length < 2}
                      onClick={() => void renameLeague(league)}
                      className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-bold text-[#102000] disabled:opacity-60"
                    >
                      Save name
                    </button>
                    <button
                      type="button"
                      disabled={busyLeagueId !== null}
                      onClick={() => {
                        setEditingLeagueId(null);
                        setDraftName("");
                      }}
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
