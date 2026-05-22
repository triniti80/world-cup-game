import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { LoginForm } from "./form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await readSession();
  if (session) {
    const { next } = await searchParams;
    redirect(next && next.startsWith("/") ? next : "/");
  }

  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="glass-card rounded-xl p-6">
        <p className="text-sm font-bold uppercase text-[var(--color-gold)]">WC2026 Friends Pool</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          Enter your email and password to open your predictions dashboard.
        </p>
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
