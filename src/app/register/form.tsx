"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function RegisterForm({ inviteCode }: { inviteCode?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState(inviteCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, inviteCode: invite }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Registration failed" }));
        setError(body.error ?? `Server responded ${res.status}.`);
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Display name</span>
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Invite code</span>
        <input
          type="text"
          value={invite}
          onChange={(e) => setInvite(e.target.value.toUpperCase())}
          placeholder="Optional for the first league"
          className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 uppercase outline-none focus:border-[var(--color-accent)]"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime disabled:opacity-60"
      >
        {busy ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-[var(--color-fg-muted)]">
        Already registered?{" "}
        <Link href="/login" className="font-bold text-[var(--color-gold)]">
          Sign in
        </Link>
      </p>
    </form>
  );
}
