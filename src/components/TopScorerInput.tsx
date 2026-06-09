"use client";

import { useId } from "react";
import { topScorerCandidates } from "@/lib/world-cup/top-scorer-candidates";

export function TopScorerInput({
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const listId = useId();

  return (
    <>
      <input
        value={value}
        list={listId}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 outline-none focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      />
      <datalist id={listId}>
        {topScorerCandidates.map((player) => (
          <option key={player} value={player} />
        ))}
      </datalist>
    </>
  );
}
