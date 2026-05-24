import { AppShell } from "@/components/AppShell";
import { readActiveLeagueId, readSession } from "@/lib/session";
import { getCurrentLeague } from "@/lib/world-cup/repository";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const currentLeague = session ? await getCurrentLeague(session.userId, activeLeagueId) : null;

  return (
    <AppShell
      user={
        session
          ? {
              name: session.name,
              email: session.email,
              role: session.role,
            }
          : undefined
      }
      activeLeagueName={currentLeague?.leagueName}
      activeLeagueMode={currentLeague?.gameMode}
    >
      {children}
    </AppShell>
  );
}
