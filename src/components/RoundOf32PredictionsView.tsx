"use client";

import { useMemo, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { getTeam, getTeamName, teams, type Team } from "@/lib/world-cup/data";
import type { LeagueR32Prediction } from "@/lib/world-cup/repository";

const groups = Array.from(new Set(teams.map((team) => team.group))).sort();

type Member = {
  userId: number;
  name: string;
};

export function RoundOf32PredictionsView({
  locale,
  members,
  predictions,
}: {
  locale: Locale;
  members: Member[];
  predictions: LeagueR32Prediction[];
}) {
  const predictionByUserId = useMemo(
    () => new Map(predictions.map((prediction) => [prediction.userId, prediction])),
    [predictions],
  );
  const revealed = predictions.some((prediction) => prediction.revealed);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    members[0]?.userId ?? null,
  );
  const selectedMember =
    members.find((member) => member.userId === selectedUserId) ?? members[0] ?? null;
  const selectedPrediction = selectedMember
    ? predictionByUserId.get(selectedMember.userId)
    : undefined;

  return (
    <section className="glass-card rounded-xl p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">
            {t(locale, "leaguePredictions.r32Title")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-fg-muted)]">
            {revealed
              ? t(locale, "leaguePredictions.r32Body")
              : t(locale, "leaguePredictions.r32Hidden")}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
          {t(locale, "stage.r32")}
        </span>
      </div>

      <div className="space-y-4 md:hidden">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase text-[var(--color-fg-muted)]">
            {locale === "he" ? "משתתף" : "Member"}
          </span>
          <select
            value={selectedMember?.userId ?? ""}
            onChange={(event) => setSelectedUserId(Number(event.target.value))}
            className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 text-sm font-bold text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
          >
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        {selectedMember ? (
          <MobileMemberPredictionCard
            locale={locale}
            member={selectedMember}
            prediction={selectedPrediction}
          />
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="w-full min-w-[1180px] border-collapse text-sm">
          <thead className="bg-[var(--color-panel-highest)] text-xs uppercase text-[var(--color-fg-muted)]">
            <tr>
              <th className="sticky start-0 z-10 bg-[var(--color-panel-highest)] px-3 py-3 text-start">
                {locale === "he" ? "משתתף" : "Member"}
              </th>
              <th className="px-3 py-3 text-start">{locale === "he" ? "סטטוס" : "Status"}</th>
              {groups.map((group) => (
                <th key={group} className="px-3 py-3 text-start">
                  {t(locale, "common.group")} {group}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {members.map((member) => {
              const prediction = predictionByUserId.get(member.userId);
              const memberPicks = prediction?.revealed ? prediction.picks : [];
              return (
                <tr key={member.userId} className="bg-[var(--color-panel-low)] align-top">
                  <th className="sticky start-0 z-10 bg-[var(--color-panel-low)] px-3 py-3 text-start font-display text-sm font-bold">
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{member.name}</span>
                      {prediction?.randomPick ? <RandomPickBadge locale={locale} /> : null}
                    </span>
                  </th>
                  <td className="px-3 py-3">
                    <StatusPill prediction={prediction} locale={locale} />
                  </td>
                  {groups.map((group) => (
                    <td key={`${member.userId}-${group}`} className="min-w-36 px-3 py-3">
                      {prediction?.revealed ? (
                        <GroupPickList group={group} picks={memberPicks} locale={locale} />
                      ) : (
                        <span className="text-[var(--color-fg-muted)]">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MobileMemberPredictionCard({
  locale,
  member,
  prediction,
}: {
  locale: Locale;
  member: Member;
  prediction: LeagueR32Prediction | undefined;
}) {
  const memberPicks = prediction?.revealed ? prediction.picks : [];

  return (
    <article className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-bold">{member.name}</h3>
        {prediction?.randomPick ? <RandomPickBadge locale={locale} /> : null}
      </div>
      <div className="mt-3">
        <StatusPill prediction={prediction} locale={locale} />
      </div>

      {prediction?.revealed ? (
        <div className="mt-4 grid gap-3">
          {groups.map((group) => (
            <div key={group} className="rounded-lg bg-[var(--color-panel-highest)] p-3">
              <div className="mb-2 text-xs font-black uppercase text-[var(--color-fg-muted)]">
                {t(locale, "common.group")} {group}
              </div>
              <GroupPickList group={group} picks={memberPicks} locale={locale} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--color-fg-muted)]">
          {t(locale, "leaguePredictions.r32Hidden")}
        </p>
      )}
    </article>
  );
}

function RandomPickBadge({ locale }: { locale: Locale }) {
  return (
    <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-0.5 text-[10px] font-black uppercase text-[var(--color-gold)]">
      {locale === "he" ? "בחירה אקראית" : "Random pick"}
    </span>
  );
}

function StatusPill({
  prediction,
  locale,
}: {
  prediction: LeagueR32Prediction | undefined;
  locale: Locale;
}) {
  const label = !prediction?.submitted
    ? t(locale, "common.missing")
    : prediction.revealed
      ? t(locale, "common.revealed")
      : t(locale, "common.submitted");

  return (
    <span className="rounded-full bg-[var(--color-panel-highest)] px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
      {label}
      {prediction?.revealed ? ` · ${prediction.picks.length}/32` : ""}
    </span>
  );
}

function GroupPickList({
  group,
  picks,
  locale,
}: {
  group: string;
  picks: LeagueR32Prediction["picks"];
  locale: Locale;
}) {
  const groupPicks = picks
    .map((pick) => ({ ...pick, team: getTeam(pick.teamId) }))
    .filter((pick): pick is LeagueR32Prediction["picks"][number] & { team: Team } =>
      Boolean(pick.team && pick.team.group === group),
    )
    .sort(
      (a, b) =>
        a.groupRank - b.groupRank ||
        (getTeamName(a.team, locale) ?? "").localeCompare(getTeamName(b.team, locale) ?? ""),
    );

  if (groupPicks.length === 0) {
    return <span className="text-[var(--color-fg-muted)]">-</span>;
  }

  return (
    <ol className="space-y-1">
      {groupPicks.map((pick) => (
        <li key={`${pick.teamId}-${pick.groupRank}`} className="whitespace-nowrap">
          <span className="me-1 font-bold text-[var(--color-accent)]">{pick.groupRank}.</span>
          <span className="font-bold">{pick.team.code}</span>
          <span className="ms-1 text-xs text-[var(--color-fg-muted)]">
            {getTeamName(pick.team, locale)}
          </span>
        </li>
      ))}
    </ol>
  );
}
