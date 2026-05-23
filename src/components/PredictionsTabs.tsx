"use client";

import { useMemo, useState } from "react";
import { PredictionForm } from "@/components/PredictionForm";
import type { Match, Stage } from "@/lib/world-cup/data";
import type { SavedPredictionMap } from "@/lib/world-cup/repository";

type GroupTab = {
  kind: "group";
  label: string;
  group: string;
};

type StageTab = {
  kind: "stage";
  label: string;
  stage: Stage | "champion";
};

type PredictionsTab = GroupTab | StageTab;

const tabs: PredictionsTab[] = [
  ...Array.from({ length: 12 }, (_, index) => {
    const group = String.fromCharCode(65 + index);
    return { kind: "group" as const, label: `Group ${group}`, group };
  }),
  { kind: "stage", label: "Round of 32", stage: "r32" },
  { kind: "stage", label: "Round of 16", stage: "r16" },
  { kind: "stage", label: "Quarter-finals", stage: "qf" },
  { kind: "stage", label: "Semi-finals", stage: "sf" },
  { kind: "stage", label: "Third place", stage: "third" },
  { kind: "stage", label: "Final", stage: "final" },
  { kind: "stage", label: "Champion", stage: "champion" },
];

type PredictionsTabsProps = {
  matches: Match[];
  initialPredictions: SavedPredictionMap;
};

export function PredictionsTabs({ matches, initialPredictions }: PredictionsTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = tabs[activeIndex] ?? tabs[0]!;

  const visibleMatches = useMemo(() => {
    if (activeTab.kind === "group") {
      return matches.filter((match) => match.stage === "group" && match.group === activeTab.group);
    }

    if (activeTab.stage === "champion") {
      return [];
    }

    return matches.filter((match) => match.stage === activeTab.stage);
  }, [activeTab, matches]);

  return (
    <div className="space-y-6">
      <section className="hide-scrollbar -mx-4 overflow-x-auto px-4 py-1">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={
                  "rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 " +
                  (active
                    ? "bg-[var(--color-accent)] text-[#102000] glow-lime"
                    : "bg-[var(--color-panel-high)] text-[var(--color-fg-muted)] hover:bg-[var(--color-panel-highest)]")
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {visibleMatches.length > 0 ? (
        <PredictionForm matches={visibleMatches} initialPredictions={initialPredictions} />
      ) : (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold">{activeTab.label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
            No fixtures are loaded for this tab yet.
          </p>
        </div>
      )}
    </div>
  );
}
