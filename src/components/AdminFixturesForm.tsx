"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { formatKickoff, teams } from "@/lib/world-cup/data";
import type { SeededMatchWithResult } from "@/lib/world-cup/repository";

type DraftFixture = {
  stage: SeededMatchWithResult["stage"];
  groupCode: string;
  homeTeamSlug: string;
  awayTeamSlug: string;
  homePlaceholder: string;
  awayPlaceholder: string;
  kickoffAtUtc: string;
  venue: string;
  status: SeededMatchWithResult["status"];
};

const stages = ["group", "r32", "r16", "qf", "sf", "third", "final"] as const;
const statuses = ["scheduled", "live", "final"] as const;

export function AdminFixturesForm({ matches }: { matches: SeededMatchWithResult[] }) {
  const { locale, t } = useI18n();
  const [drafts, setDrafts] = useState<Record<number, DraftFixture>>(
    Object.fromEntries(
      matches.map((match) => [
        match.dbId,
        {
          stage: match.stage,
          groupCode: match.group ?? "",
          homeTeamSlug: match.homeTeamId ?? "",
          awayTeamSlug: match.awayTeamId ?? "",
          homePlaceholder: match.homePlaceholder ?? "",
          awayPlaceholder: match.awayPlaceholder ?? "",
          kickoffAtUtc: match.kickoffAtUtc,
          venue: match.venue,
          status: match.status,
        },
      ]),
    ),
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | SeededMatchWithResult["stage"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SeededMatchWithResult["status"]>("all");

  const visibleMatches = useMemo(
    () =>
      matches.filter((match) => {
        const draft = drafts[match.dbId];
        if (!draft) return false;
        const search = query.trim().toLocaleLowerCase();
        const home = teamName(draft.homeTeamSlug) || draft.homePlaceholder || "";
        const away = teamName(draft.awayTeamSlug) || draft.awayPlaceholder || "";
        const haystack = [
          String(match.number),
          draft.stage,
          draft.groupCode,
          draft.status,
          home,
          away,
          draft.venue,
        ]
          .join(" ")
          .toLocaleLowerCase();

        return (
          (search === "" || haystack.includes(search)) &&
          (stageFilter === "all" || draft.stage === stageFilter) &&
          (statusFilter === "all" || draft.status === statusFilter)
        );
      }),
    [drafts, matches, query, stageFilter, statusFilter],
  );

  function update(matchDbId: number, key: keyof DraftFixture, value: string) {
    setErrors((current) => ({ ...current, [matchDbId]: "" }));
    setMessages((current) => ({ ...current, [matchDbId]: "" }));
    setDrafts((current) => ({
      ...current,
      [matchDbId]: {
        ...current[matchDbId]!,
        [key]: value,
      },
    }));
  }

  async function save(match: SeededMatchWithResult) {
    const draft = drafts[match.dbId];
    if (!draft) return;

    setSaving(match.dbId);
    setErrors((current) => ({ ...current, [match.dbId]: "" }));
    setMessages((current) => ({ ...current, [match.dbId]: "" }));
    try {
      const res = await fetch("/api/admin/fixtures", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchDbId: match.dbId,
          stage: draft.stage,
          groupCode: draft.groupCode || null,
          homeTeamSlug: draft.homeTeamSlug || null,
          awayTeamSlug: draft.awayTeamSlug || null,
          homePlaceholder: draft.homePlaceholder || null,
          awayPlaceholder: draft.awayPlaceholder || null,
          kickoffAtUtc: draft.kickoffAtUtc,
          venue: draft.venue,
          status: draft.status,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors((current) => ({
          ...current,
          [match.dbId]: body?.error ?? `Server responded ${res.status}.`,
        }));
        return;
      }
      setMessages((current) => ({ ...current, [match.dbId]: locale === "he" ? "המשחק נשמר." : "Fixture saved." }));
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [match.dbId]: err instanceof Error ? err.message : t("auth.networkError"),
      }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="glass-card rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold">{locale === "he" ? "ניהול משחקים" : "Admin Fixture Management"}</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          {locale === "he"
            ? "עריכת משחקים מיובאים בלי לשנות קוד. השתמש בזמני UTC ISO לשעת פתיחה."
            : "Edit imported fixtures without changing code. Use UTC ISO timestamps for kickoff times."}
        </p>
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-3 md:grid-cols-[1fr_auto_auto_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === "he" ? "חיפוש משחק, קבוצה, אצטדיון" : "Search match, team, venue"}
          className={inputClass}
        />
        <select
          value={stageFilter}
          onChange={(event) =>
            setStageFilter(event.target.value as "all" | SeededMatchWithResult["stage"])
          }
          className={inputClass}
          aria-label="Filter fixture stage"
        >
          <option value="all">{locale === "he" ? "כל השלבים" : "All stages"}</option>
          {stages.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "all" | SeededMatchWithResult["status"])
          }
          className={inputClass}
          aria-label="Filter fixture status"
        >
          <option value="all">{locale === "he" ? "כל הסטטוסים" : "All statuses"}</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <div className="flex items-center rounded-lg bg-[var(--color-panel-highest)] px-3 text-sm font-bold text-[var(--color-accent)]">
          {visibleMatches.length}/{matches.length}
        </div>
      </div>

      <div className="space-y-3">
        {visibleMatches.map((match) => {
          const draft = drafts[match.dbId]!;
          const error = errors[match.dbId];
          const message = messages[match.dbId];
          return (
            <details
              key={match.dbId}
              className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4"
            >
              <summary className="grid cursor-pointer list-none gap-3 md:grid-cols-[1fr_auto] [&::-webkit-details-marker]:hidden">
                <div>
                  <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                    {t("common.match")} {match.number} · {draft.stage}
                    {draft.groupCode ? ` · ${t("common.group")} ${draft.groupCode}` : ""}
                  </div>
                  <h3 className="mt-1 font-display text-base font-bold">
                    {teamName(draft.homeTeamSlug) || draft.homePlaceholder || t("common.tbd")} {t("common.vs")}{" "}
                    {teamName(draft.awayTeamSlug) || draft.awayPlaceholder || t("common.tbd")}
                  </h3>
                  <div className="mt-1 text-xs text-[var(--color-fg-muted)]">
                    {formatKickoff(draft.kickoffAtUtc, locale)} · {draft.venue}
                  </div>
                </div>
                <span className="h-fit rounded-full bg-[var(--color-panel-highest)] px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
                  {draft.status}
                </span>
              </summary>

              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-2">
                <Field label="Stage">
                  <select
                    value={draft.stage}
                    onChange={(event) => update(match.dbId, "stage", event.target.value)}
                    className={inputClass}
                  >
                    {stages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Group">
                  <input
                    value={draft.groupCode}
                    onChange={(event) => update(match.dbId, "groupCode", event.target.value.toUpperCase())}
                    maxLength={2}
                    className={inputClass}
                  />
                </Field>

                <TeamSelect
                  label="Home team"
                  value={draft.homeTeamSlug}
                  onChange={(value) => update(match.dbId, "homeTeamSlug", value)}
                />
                <TeamSelect
                  label="Away team"
                  value={draft.awayTeamSlug}
                  onChange={(value) => update(match.dbId, "awayTeamSlug", value)}
                />

                <Field label="Home placeholder">
                  <input
                    value={draft.homePlaceholder}
                    onChange={(event) => update(match.dbId, "homePlaceholder", event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Away placeholder">
                  <input
                    value={draft.awayPlaceholder}
                    onChange={(event) => update(match.dbId, "awayPlaceholder", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Kickoff UTC">
                  <input
                    value={draft.kickoffAtUtc}
                    onChange={(event) => update(match.dbId, "kickoffAtUtc", event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Venue">
                  <input
                    value={draft.venue}
                    onChange={(event) => update(match.dbId, "venue", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Status">
                  <select
                    value={draft.status}
                    onChange={(event) => update(match.dbId, "status", event.target.value)}
                    className={inputClass}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  {error ? (
                    <span className="font-semibold text-[var(--color-danger)]">{error}</span>
                  ) : message ? (
                    <span className="font-semibold text-[var(--color-accent)]">{message}</span>
                  ) : (
                    <span className="text-[var(--color-fg-muted)]">
                      {locale === "he" ? "שינויים משפיעים על משחקים וניחושים עתידיים." : "Changes affect fixtures and future picks."}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={saving !== null}
                  onClick={() => void save(match)}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[#102000] disabled:opacity-60"
                >
                  {saving === match.dbId ? t("common.saving") : locale === "he" ? "שמירת משחק" : "Save Fixture"}
                </button>
              </div>
            </details>
          );
        })}
        {visibleMatches.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4 text-sm text-[var(--color-fg-muted)]">
            No fixtures match these filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase text-[var(--color-fg-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function TeamSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        <option value="">TBD / placeholder</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            Group {team.group} · {team.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function teamName(teamId: string): string {
  return teams.find((team) => team.id === teamId)?.name ?? "";
}
