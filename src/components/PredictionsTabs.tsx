"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { PredictionForm } from "@/components/PredictionForm";
import type { Match } from "@/lib/world-cup/data";
import type { SavedPredictionMap } from "@/lib/world-cup/repository";

type DateTab = {
  key: string;
  month: string;
  day: string;
  label: string;
};

type PredictionsTabsProps = {
  matches: Match[];
  initialPredictions: SavedPredictionMap;
};

export function PredictionsTabs({ matches, initialPredictions }: PredictionsTabsProps) {
  const { locale, t } = useI18n();
  const [activeDate, setActiveDate] = useState("all");
  const sortedMatches = useMemo(() => [...matches].sort(sortMatchesByKickoff), [matches]);
  const dateTabs = useMemo(() => buildDateTabs(sortedMatches, locale), [locale, sortedMatches]);

  const visibleMatches = useMemo(() => {
    if (activeDate === "all") return sortedMatches;
    return sortedMatches.filter((match) => getLocalDateKey(match.kickoffAtUtc) === activeDate);
  }, [activeDate, sortedMatches]);

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

      {visibleMatches.length > 0 ? (
        <PredictionForm matches={visibleMatches} initialPredictions={initialPredictions} />
      ) : (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold">{t("fixtures.noFixtures")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
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

function sortMatchesByKickoff(a: Match, b: Match): number {
  return new Date(a.kickoffAtUtc).getTime() - new Date(b.kickoffAtUtc).getTime() || a.number - b.number;
}
