import { formatKickoff, tournament } from "@/lib/world-cup/data";

export default function SettingsPage() {
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

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className="text-right font-bold text-[var(--color-accent)]">{value}</span>
    </div>
  );
}
