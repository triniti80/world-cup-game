import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { RegisterForm } from "./form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const session = await readSession();
  if (session) redirect("/");

  const { invite } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="glass-card rounded-xl p-6">
        <p className="text-sm font-bold uppercase text-[var(--color-gold)]">Join WC2026</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Create account</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          Make your picks, keep them private until kickoff, and compete with friends.
        </p>
        <div className="mt-6">
          <RegisterForm inviteCode={invite} />
        </div>
      </div>
    </main>
  );
}
