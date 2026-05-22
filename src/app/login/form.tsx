"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Login failed" }));
        setError(body.error ?? `Server responded ${res.status}.`);
        setBusy(false);
        return;
      }
      router.push(next && next.startsWith("/") ? next : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)]"
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
        {busy ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-[var(--color-fg-muted)]">
        New to the pool?{" "}
        <Link href="/register" className="font-bold text-[var(--color-gold)]">
          Create an account
        </Link>
      </p>
    </form>
  );
}
