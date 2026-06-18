import Link from "next/link";
import type { ReactNode } from "react";
import { LockCountdown } from "@/components/LockCountdown";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import { formatKickoff, tournament } from "@/lib/world-cup/data";
import { MatchCard } from "@/components/world-cup/MatchCard";
import { getSeededMatchesWithResults } from "@/lib/world-cup/repository";

export default async function DashboardPage() {
  const locale = await readLocale();
  const matches = await getSeededMatchesWithResults();
  const now = Date.now();
  const nextMatches = matches
    .filter((match) => match.status !== "final" && new Date(match.kickoffAtUtc).getTime() >= now)
    .slice(0, 4);
  const serverNowUtc = new Date().toISOString();

  return (
    <div className="space-y-6">
      <section className="glass-card glow-gold relative overflow-hidden rounded-xl p-6 md:p-8">
        <div className="absolute right-6 top-4 font-display text-8xl font-extrabold text-white/5">
          26
        </div>
        <p className="text-sm font-bold uppercase text-[var(--color-gold)]">{tournament.name}</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold text-[var(--color-fg)] md:text-5xl">
          {t(locale, "dashboard.title")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)] md:text-base">
          {t(locale, "dashboard.body")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/predictions"
            className="rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime active:scale-95"
          >
            {t(locale, "dashboard.makePredictions")}
          </Link>
          <Link
            href="/instructions"
            className="rounded-lg border border-[var(--color-gold)] px-4 py-3 text-sm font-bold text-[var(--color-gold)] active:scale-95"
          >
            {t(locale, "dashboard.howToPlay")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label={t(locale, "dashboard.qualifierLock")} value={formatKickoff(tournament.qualifierLockAtUtc, locale)}>
          <LockCountdown targetAtUtc={tournament.qualifierLockAtUtc} serverNowUtc={serverNowUtc} />
        </SummaryCard>
        <SummaryCard label={t(locale, "dashboard.knockoutLock")} value={formatKickoff(tournament.knockoutLockAtUtc, locale)}>
          <LockCountdown targetAtUtc={tournament.knockoutLockAtUtc} serverNowUtc={serverNowUtc} />
        </SummaryCard>
        <SummaryCard label={t(locale, "dashboard.scoreLock")} value={t(locale, "dashboard.scoreLockValue")} />
        <SummaryCard label={t(locale, "dashboard.visibility")} value={t(locale, "dashboard.visibilityValue")} />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">{t(locale, "dashboard.nextUp")}</h2>
            <p className="text-sm text-[var(--color-fg-muted)]">
              {t(locale, "dashboard.nextUpBody")}
            </p>
          </div>
          <Link href="/fixtures" className="text-sm font-medium">
            {t(locale, "dashboard.allFixtures")}
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {nextMatches.map((match) => (
            <MatchCard key={match.id} match={match} locale={locale} showOutcomePoints />
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div className="mt-2 font-display text-lg font-extrabold text-[var(--color-accent)]">
        {value}
      </div>
      {children}
    </div>
  );
}
