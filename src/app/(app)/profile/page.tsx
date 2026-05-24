import Link from "next/link";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { readSession } from "@/lib/session";
import { getUserProfileSummary } from "@/lib/world-cup/repository";

export default async function ProfilePage() {
  const session = await readSession();
  const profile = session ? await getUserProfileSummary(session.userId) : null;

  if (!profile) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h1 className="font-display text-2xl font-extrabold">Profile unavailable</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          Sign in again to view your profile.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-xl p-6">
        <div className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
          <ProfileAvatar name={profile.user.name} email={profile.user.email} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-extrabold">{profile.user.name}</h1>
              {profile.user.role === "admin" ? (
                <span className="rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-3 py-1 text-xs font-bold uppercase text-[var(--color-gold)]">
                  Admin
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">{profile.user.email}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
              This profile photo is generated from your account name. League totals and ranks
              are calculated from stored scoring events.
            </p>
          </div>
          {profile.user.role === "admin" ? (
            <Link
              href="/settings"
              className="h-fit rounded-lg bg-[var(--color-accent)] px-4 py-3 text-center text-sm font-bold text-[#102000] glow-lime"
            >
              Admin Settings
            </Link>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold">My Leagues</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Your registered leagues, score, and rank in each table.
          </p>
        </div>

        {profile.leagues.length > 0 ? (
          <div className="grid gap-3">
            {profile.leagues.map((league) => (
              <article
                key={league.leagueId}
                className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <h3 className="font-display text-lg font-bold">{league.leagueName}</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-fg-muted)]">
                      <span className="rounded-full bg-[var(--color-panel-highest)] px-3 py-1 font-bold">
                        {league.gameMode === "match_scores" ? "Score game" : "Stage game"}
                      </span>
                      <span className="rounded-full bg-[var(--color-panel-highest)] px-3 py-1 font-bold">
                        Display: {league.displayName}
                      </span>
                      <span className="rounded-full bg-[var(--color-panel-highest)] px-3 py-1 font-bold">
                        Invite: {league.inviteCode}
                      </span>
                    </div>
                  </div>
                  <ProfileStat label="Rank" value={`#${league.rank} / ${league.memberCount}`} />
                  <ProfileStat label="Total" value={`${league.total} pts`} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-6">
            <h3 className="font-display text-xl font-bold">No leagues yet</h3>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              Create or join a league to start playing.
            </p>
            <Link
              href="/leagues"
              className="mt-4 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime"
            >
              Go to Leagues
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-panel-highest)] px-4 py-3 text-right">
      <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">{label}</div>
      <div className="mt-1 font-display text-xl font-extrabold text-[var(--color-accent)]">
        {value}
      </div>
    </div>
  );
}
