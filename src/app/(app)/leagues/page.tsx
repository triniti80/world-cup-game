import Link from "next/link";
import { LeagueForms } from "@/components/LeagueForms";
import { LeagueList } from "@/components/LeagueList";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import { readActiveLeagueId, readSession } from "@/lib/session";
import { getCurrentLeague, getUserLeagues } from "@/lib/world-cup/repository";

export default async function LeaguesPage() {
  const locale = await readLocale();
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const leagues = session ? await getUserLeagues(session.userId) : [];
  const currentLeague = session ? await getCurrentLeague(session.userId, activeLeagueId) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">{t(locale, "leagues.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
            {t(locale, "leagues.body")}
          </p>
        </div>
        <Link
          href="/league-predictions"
          className="inline-flex w-fit rounded-lg border border-[var(--color-gold)] px-4 py-3 text-sm font-bold text-[var(--color-gold)] transition active:scale-95"
        >
          {t(locale, "nav.leaguePredictions")}
        </Link>
      </div>

      <LeagueForms />

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">{t(locale, "leagues.yourLeagues")}</h2>
        <LeagueList
          leagues={leagues}
          activeLeagueId={currentLeague?.leagueId ?? null}
          currentUserId={session?.userId ?? 0}
          canAdminManage={session?.role === "admin"}
        />
      </section>
    </div>
  );
}
