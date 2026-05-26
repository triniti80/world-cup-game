"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinInviteCard({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joinLeague() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "join", inviteCode }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? `Server responded ${res.status}.`);
        return;
      }
      router.push("/leagues");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join league.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-card rounded-xl p-6">
      <p className="text-sm font-bold uppercase text-[var(--color-gold)]">League invite</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold">Join this league</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--color-fg-muted)]">
        Use invite code <span className="font-bold text-[var(--color-gold)]">{inviteCode}</span> to
        join the league and make it your active league.
      </p>

      {error ? (
        <div className="mt-4 rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void joinLeague()}
        className="mt-6 w-full rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime disabled:opacity-60"
      >
        {busy ? "Joining..." : "Join league"}
      </button>
    </section>
  );
}
