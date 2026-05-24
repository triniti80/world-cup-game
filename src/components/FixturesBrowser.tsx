"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { MatchCard } from "@/components/world-cup/MatchCard";
import type { TranslationKey } from "@/lib/i18n";
import { stageLabel, type Match } from "@/lib/world-cup/data";
import type { SavedPredictionMap } from "@/lib/world-cup/repository";

type FixtureFilter = "all" | "my-picks" | "live" | "group" | "knockout";

type DateTab = {
  key: string;
  month: string;
  day: string;
  label: string;
};

const filters: { id: FixtureFilter; labelKey: TranslationKey }[] = [
  { id: "all", labelKey: "common.all" },
  { id: "my-picks", labelKey: "fixtures.myPicks" },
  { id: "live", labelKey: "common.live" },
  { id: "group", labelKey: "fixtures.groupStage" },
  { id: "knockout", labelKey: "common.knockout" },
];

export function FixturesBrowser({
  matches,
  savedPredictions,
}: {
  matches: Match[];
  savedPredictions: SavedPredictionMap;
}) {
  const { locale, t } = useI18n();
  const [activeDate, setActiveDate] = useState("all");
  const [activeFilter, setActiveFilter] = useState<FixtureFilter>("all");

  const dateTabs = useMemo(() => buildDateTabs(matches, locale), [locale, matches]);
  const visibleMatches = useMemo(
    () =>
      matches.filter((match) => {
        const matchesDate = activeDate === "all" || getLocalDateKey(match.kickoffAtUtc) === activeDate;
        if (!matchesDate) return false;

        switch (activeFilter) {
          case "my-picks":
            return Boolean(savedPredictions[match.id]);
          case "live":
            return match.status === "live";
          case "group":
            return match.stage === "group";
          case "knockout":
            return match.stage !== "group";
          case "all":
            return true;
        }
      }),
    [activeDate, activeFilter, matches, savedPredictions],
  );

  const sections = useMemo(() => buildSections(visibleMatches, locale), [locale, visibleMatches]);

  return (
    <div className="space-y-6">
      <section className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          onClick={() => setActiveDate("all")}
          className={dateButtonClass(activeDate === "all")}
          aria-pressed={activeDate === "all"}
        >
          <span className="text-xs">{t("common.all").toUpperCase()}</span>
          <span className="font-display text-2xl font-extrabold">{matches.length}</span>
        </button>
        {dateTabs.map((date) => (
          <button
            key={date.key}
            type="button"
            onClick={() => setActiveDate(date.key)}
            className={dateButtonClass(activeDate === date.key)}
            aria-pressed={activeDate === date.key}
            title={date.label}
          >
            <span className="text-xs">{date.month}</span>
            <span className="font-display text-2xl font-extrabold">{date.day}</span>
          </button>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={
                "rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 " +
                (active
                  ? "border border-[var(--color-accent)] bg-[var(--color-panel-highest)] text-[var(--color-accent)]"
                  : "bg-[var(--color-panel-low)] text-[var(--color-fg-muted)] hover:bg-[var(--color-panel-high)]")
              }
              aria-pressed={active}
            >
              {t(filter.labelKey)}
            </button>
          );
        })}
      </section>

      {sections.length > 0 ? (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.key} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[var(--color-primary)]">
                  <span
                    className={
                      "h-6 w-1 rounded-full " +
                      (section.stage === "group"
                        ? "bg-[var(--color-accent)]"
                        : "bg-[var(--color-gold)]")
                    }
                  />
                  {section.title}
                </h2>
                <span className="rounded-full bg-[var(--color-panel-high)] px-3 py-1 text-xs font-bold uppercase text-[var(--color-fg-muted)]">
                  {section.count} {t("fixtures.matches")}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {section.matches.map((match) => (
                  <MatchCard key={match.id} match={match} locale={locale} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold">{t("fixtures.noFixtures")}</h2>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            {t("fixtures.tryAnother")}
          </p>
        </div>
      )}
    </div>
  );
}

function dateButtonClass(active: boolean): string {
  return (
    "flex h-20 min-w-16 flex-col items-center justify-center rounded-xl font-bold transition active:scale-95 " +
    (active
      ? "bg-[var(--color-accent)] text-[#102000] glow-lime"
      : "bg-[var(--color-panel-highest)] text-[var(--color-fg-muted)] hover:bg-[var(--color-panel-high)]")
  );
}

function buildDateTabs(matches: Match[], locale: "en" | "he"): DateTab[] {
  const seen = new Set<string>();
  return matches.flatMap((match) => {
    const key = getLocalDateKey(match.kickoffAtUtc);
    if (seen.has(key)) return [];
    seen.add(key);

    const date = new Date(match.kickoffAtUtc);
    return [
      {
        key,
        month: new Intl.DateTimeFormat(locale, { month: "short" }).format(date).toUpperCase(),
        day: new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(date),
        label: new Intl.DateTimeFormat(locale, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(date),
      },
    ];
  });
}

function getLocalDateKey(iso: string): string {
  const date = new Date(iso);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildSections(matches: Match[], locale: "en" | "he") {
  const sectionMap = new Map<
    string,
    { key: string; title: string; stage: Match["stage"]; matches: Match[] }
  >();

  for (const match of matches) {
    const key = match.stage === "group" ? `group-${match.group}` : match.stage;
    const title =
      match.stage === "group"
        ? `${locale === "he" ? "בית" : "Group"} ${match.group ?? "TBD"}`
        : stageLabel(match.stage, locale);
    const section = sectionMap.get(key) ?? {
      key,
      title,
      stage: match.stage,
      matches: [],
    };
    section.matches.push(match);
    sectionMap.set(key, section);
  }

  return Array.from(sectionMap.values()).map((section) => ({
    ...section,
    count: section.matches.length,
  }));
}
