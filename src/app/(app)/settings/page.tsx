import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import { readSession } from "@/lib/session";
import { formatKickoff, tournament } from "@/lib/world-cup/data";
import {
  getAdminLeagues,
  getAdminUsers,
  getRecentAdminAuditEntries,
  type AdminAuditEntry,
} from "@/lib/world-cup/repository";

export default async function SettingsPage() {
  const locale = await readLocale();
  const session = await readSession();
  const adminUsers = session?.role === "admin" ? await getAdminUsers() : [];
  const adminLeagues = session?.role === "admin" ? await getAdminLeagues() : [];
  const auditEntries = session?.role === "admin" ? await getRecentAdminAuditEntries() : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t(locale, "settings.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          {t(locale, "settings.body")}
        </p>
      </div>

      <section className="glass-card rounded-xl p-5">
        <h2 className="font-display text-lg font-bold">{t(locale, "settings.locks")}</h2>
        <div className="mt-4 divide-y divide-white/10 text-sm">
          <SettingRow label={t(locale, "settings.tournament")} value={tournament.name} />
          <SettingRow label={t(locale, "settings.firstMatch")} value={formatKickoff(tournament.firstMatchAtUtc, locale)} />
          <SettingRow
            label={t(locale, "settings.qualifierLock")}
            value={formatKickoff(tournament.qualifierLockAtUtc, locale)}
          />
          <SettingRow label={t(locale, "settings.scoreLock")} value={t(locale, "settings.scoreLockValue")} />
          <SettingRow label={t(locale, "settings.qualifierVisibility")} value={t(locale, "settings.qualifierVisibilityValue")} />
          <SettingRow label={t(locale, "settings.scoreVisibility")} value={t(locale, "settings.scoreVisibilityValue")} />
        </div>
      </section>

      {session?.role === "admin" ? (
        <>
          <AdminUsersPanel users={adminUsers} leagues={adminLeagues} currentUserId={session.userId} />
          <AdminAuditLog entries={auditEntries} locale={locale} />
        </>
      ) : null}

      <section className="rounded-xl border border-dashed border-[var(--color-gold)]/50 bg-[var(--color-panel-low)] p-5">
        <h2 className="font-display text-lg font-bold">{locale === "he" ? "בהמשך" : "Coming next"}</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-fg-muted)]">
          <li>User access controls are now available above.</li>
          <li>League management overview is now available above.</li>
          <li>Fixture and result tools can be moved to a dedicated hidden admin route later.</li>
          <li>Next: edit league names/game modes and assign additional admins.</li>
        </ul>
      </section>
    </div>
  );
}

function AdminAuditLog({ entries, locale }: { entries: AdminAuditEntry[]; locale: "en" | "he" }) {
  return (
    <section className="glass-card rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold">{t(locale, "settings.adminChanges")}</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          {t(locale, "settings.adminChangesBody")}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
          {t(locale, "settings.noAdminChanges")}
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
                  {formatKickoff(entry.createdAt, locale)}
                </span>
              </summary>
              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-2">
                <AuditJsonBlock title={t(locale, "settings.before")} value={entry.beforeJson} />
                <AuditJsonBlock title={t(locale, "settings.after")} value={entry.afterJson} />
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
      <span className="text-end font-bold text-[var(--color-accent)]">{value}</span>
    </div>
  );
}
