"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { LeagueGameMode } from "@/lib/world-cup/repository";

const gameModeLabels: Record<LeagueGameMode, string> = {
  stage_predictions: "Pre-tournament stage prediction",
  match_scores: "Match score guessing",
};

export function LeagueForms() {
  const router = useRouter();
  const [leagueName, setLeagueName] = useState("");
  const [gameMode, setGameMode] = useState<LeagueGameMode>("match_scores");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: unknown, busyKey: string) {
    setBusy(busyKey);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Server responded ${res.status}.`);
        return;
      }
      setMessage(
        body?.league?.inviteCode
          ? `League ready. Invite code: ${body.league.inviteCode}`
          : "League updated.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(null);
    }
  }

  async function createLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit({ action: "create", name: leagueName, gameMode }, "create");
  }

  async function joinLeague(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit({ action: "join", inviteCode }, "join");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={createLeague} className="glass-card rounded-xl p-5">
        <h2 className="font-display text-xl font-bold">Create League</h2>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold">League name</span>
          <input
            value={leagueName}
            onChange={(event) => setLeagueName(event.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <div className="mt-4 grid gap-2">
          {(Object.keys(gameModeLabels) as LeagueGameMode[]).map((mode) => (
            <label
              key={mode}
              className={
                "cursor-pointer rounded-lg border p-3 transition " +
                (gameMode === mode
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-white/10 bg-[var(--color-panel-high)]")
              }
            >
              <input
                type="radio"
                name="gameMode"
                value={mode}
                checked={gameMode === mode}
                onChange={() => setGameMode(mode)}
                className="sr-only"
              />
              <span className="font-semibold">{gameModeLabels[mode]}</span>
              <span className="mt-1 block text-sm text-[var(--color-fg-muted)]">
                {mode === "match_scores"
                  ? "Guess match scores, plus top scorer and champion bonus picks."
                  : "Pick teams by stage before the tournament, plus top scorer."}
              </span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={busy !== null}
          className="mt-5 rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime disabled:opacity-60"
        >
          {busy === "create" ? "Creating..." : "Create League"}
        </button>
      </form>

      <form onSubmit={joinLeague} className="glass-card rounded-xl p-5">
        <h2 className="font-display text-xl font-bold">Join League</h2>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold">Invite code</span>
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            required
            className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 uppercase outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <button
          type="submit"
          disabled={busy !== null}
          className="mt-5 rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime disabled:opacity-60"
        >
          {busy === "join" ? "Joining..." : "Join League"}
        </button>

        <p className="mt-4 text-sm text-[var(--color-fg-muted)]">
          The league creator can share the invite code from this page.
        </p>
      </form>

      {(message || error) && (
        <div
          className={
            "rounded-lg border px-3 py-2 text-sm lg:col-span-2 " +
            (error
              ? "border-[var(--color-danger)] bg-[var(--color-danger)]/10"
              : "border-[var(--color-accent)] bg-[var(--color-accent)]/10")
          }
        >
          {error ?? message}
        </div>
      )}
    </div>
  );
}
