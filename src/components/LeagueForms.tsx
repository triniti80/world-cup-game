"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/I18nProvider";
import type { LeagueGameMode } from "@/lib/world-cup/repository";

export function LeagueForms() {
  const router = useRouter();
  const { t } = useI18n();
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
          ? t("leagues.ready", { code: body.league.inviteCode })
          : t("leagues.updated"),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.networkError"));
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
        <h2 className="font-display text-xl font-bold">{t("leagues.create")}</h2>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold">{t("leagues.name")}</span>
          <input
            value={leagueName}
            onChange={(event) => setLeagueName(event.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <div className="mt-4 grid gap-2">
          {(["stage_predictions", "match_scores"] as LeagueGameMode[]).map((mode) => (
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
              <span className="font-semibold">
                {mode === "match_scores" ? t("app.matchScores") : t("app.stagePredictions")}
              </span>
              <span className="mt-1 block text-sm text-[var(--color-fg-muted)]">
                {mode === "match_scores"
                  ? t("leagues.matchDesc")
                  : t("leagues.stageDesc")}
              </span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={busy !== null}
          className="mt-5 rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime disabled:opacity-60"
        >
          {busy === "create" ? t("leagues.createBusy") : t("leagues.create")}
        </button>
      </form>

      <form onSubmit={joinLeague} className="glass-card rounded-xl p-5">
        <h2 className="font-display text-xl font-bold">{t("leagues.join")}</h2>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold">{t("auth.inviteCode")}</span>
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
          {busy === "join" ? t("leagues.joinBusy") : t("leagues.join")}
        </button>

        <p className="mt-4 text-sm text-[var(--color-fg-muted)]">
          {t("leagues.creatorHelp")}
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
