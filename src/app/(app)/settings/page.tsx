import { AdminFixturesForm } from "@/components/AdminFixturesForm";
import { AdminOfficialResultsForm } from "@/components/AdminOfficialResultsForm";
import { AdminResultsForm } from "@/components/AdminResultsForm";
import { readSession } from "@/lib/session";
import { formatKickoff, tournament } from "@/lib/world-cup/data";
import {
  getAdminOfficialResults,
  getRecentAdminAuditEntries,
  getSeededMatchesWithResults,
  type AdminAuditEntry,
} from "@/lib/world-cup/repository";

export default async function SettingsPage() {
  const session = await readSession();
  const matches = session?.role === "admin" ? await getSeededMatchesWithResults() : [];
  const officialResults = session?.role === "admin" ? await getAdminOfficialResults() : null;
  const auditEntries = session?.role === "admin" ? await getRecentAdminAuditEntries() : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          Admin tools for the pool. Full fixture import, users, leagues, and result
          entry will be added as the database model comes online.
        </p>
      </div>

      <section className="glass-card rounded-xl p-5">
        <h2 className="font-display text-lg font-bold">Tournament locks</h2>
        <div className="mt-4 divide-y divide-white/10 text-sm">
          <SettingRow label="Tournament" value={tournament.name} />
          <SettingRow label="First match starts" value={formatKickoff(tournament.firstMatchAtUtc)} />
          <SettingRow
            label="Qualifier picks lock"
            value={formatKickoff(tournament.qualifierLockAtUtc)}
          />
          <SettingRow label="Score picks lock" value="5 minutes before each match" />
          <SettingRow label="Qualifier visibility" value="After the first match starts" />
          <SettingRow label="Score visibility" value="After each match starts" />
        </div>
      </section>

      {session?.role === "admin" ? (
        <>
          <AdminFixturesForm matches={matches} />
          <AdminResultsForm matches={matches} />
          {officialResults ? <AdminOfficialResultsForm initialResults={officialResults} /> : null}
          <AdminAuditLog entries={auditEntries} />
        </>
      ) : null}

      <section className="rounded-xl border border-dashed border-[var(--color-gold)]/50 bg-[var(--color-panel-low)] p-5">
        <h2 className="font-display text-lg font-bold">Coming next</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-fg-muted)]">
          <li>Invite codes and real user accounts.</li>
          <li>Admin fixture import and editing.</li>
          <li>Final score entry and automatic scoring recalculation.</li>
          <li>League-specific visibility and leaderboard permissions.</li>
        </ul>
      </section>
    </div>
  );
}

function AdminAuditLog({ entries }: { entries: AdminAuditEntry[] }) {
  return (
    <section className="glass-card rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold">Recent Admin Changes</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Fixture, result, and official tournament changes are recorded with before/after details.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
          No admin changes have been recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <details
              key={entry.id}
              className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4"
            >
              <summary className="grid cursor-pointer list-none gap-3 md:grid-cols-[1fr_auto] [&::-webkit-details-marker]:hidden">
                <div>
                  <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                    {entry.action} · {entry.entityType} #{entry.entityId}
                  </div>
                  <h3 className="mt-1 font-display text-base font-bold">
                    {entry.actorName}
                  </h3>
                </div>
                <span className="h-fit rounded-full bg-[var(--color-panel-highest)] px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
                  {formatKickoff(entry.createdAt)}
                </span>
              </summary>
              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-2">
                <AuditJsonBlock title="Before" value={entry.beforeJson} />
                <AuditJsonBlock title="After" value={entry.afterJson} />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function AuditJsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-lg bg-[var(--color-panel-highest)] p-3">
      <div className="mb-2 text-xs font-bold uppercase text-[var(--color-fg-muted)]">{title}</div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[var(--color-fg)]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className="text-right font-bold text-[var(--color-accent)]">{value}</span>
    </div>
  );
}
