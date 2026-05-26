import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { JoinInviteCard } from "./JoinInviteCard";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const inviteCode = code.trim().toUpperCase();
  const session = await readSession();

  if (!session) {
    redirect(`/register?invite=${encodeURIComponent(inviteCode)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <JoinInviteCard inviteCode={inviteCode} />
    </main>
  );
}
