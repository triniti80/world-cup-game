"use client";

import { useMemo, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { getTeam, getTeamName, teams, type Team } from "@/lib/world-cup/data";
import type {
  MobileLeaguePredictionStage,
  MobileLeagueStagePick,
  MobileLeagueStagePrediction,
} from "@/lib/world-cup/repository";

const groups = Array.from(new Set(teams.map((team) => team.group))).sort();
const knockoutStages = ["r16", "qf", "sf", "final", "champion"] as const;

type Member = {
  userId: number;
  name: string;
};

export function StagePredictionsView({
  locale,
  members,
  stages,
}: {
  locale: Locale;
  members: Member[];
  stages: MobileLeaguePredictionStage[];
}) {
  const r32Stage = stages.find((stage) => stage.stage === "r32");
  const knockoutStageRows = knockoutStages
    .map((stageId) => stages.find((stage) => stage.stage === stageId))
    .filter((stage): stage is MobileLeaguePredictionStage => Boolean(stage));
  const r32Revealed = Boolean(r32Stage?.locked);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    members[0]?.userId ?? null,
  );
  const selectedMember =
    members.find((member) => member.userId === selectedUserId) ?? members[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">
              {t(locale, "leaguePredictions.r32Title")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-[var(--color-fg-muted)]">
              {r32Revealed
                ? t(locale, "leaguePredictions.r32Body")
                : t(locale, "leaguePredictions.r32Hidden")}
            </p>
          </div>
          <span className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
            {t(locale, "stage.r32")}
          </span>
        </div>

        <div className="space-y-4 md:hidden">
          <MemberSelect
            locale={locale}
            members={members}
            selectedUserId={selectedMember?.userId ?? null}
            onChange={setSelectedUserId}
          />

          {selectedMember ? (
            <MobileR32PredictionCard
              locale={locale}
              member={selectedMember}
              prediction={findPrediction(r32Stage, selectedMember.userId)}
              revealed={r32Revealed}
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
                const prediction = findPrediction(r32Stage, member.userId);
                const memberPicks = r32Revealed ? prediction?.picks ?? [] : [];
                return (
                  <tr key={member.userId} className="bg-[var(--color-panel-low)] align-top">
                    <th className="sticky start-0 z-10 bg-[var(--color-panel-low)] px-3 py-3 text-start font-display text-sm font-bold">
                      <MemberName member={member} randomPick={Boolean(prediction?.randomPick)} locale={locale} />
                    </th>
                    <td className="px-3 py-3">
                      <StatusPill prediction={prediction} expected={r32Stage?.expected ?? 32} locale={locale} />
                    </td>
                    {groups.map((group) => (
                      <td key={`${member.userId}-${group}`} className="min-w-36 px-3 py-3">
                        {r32Revealed ? (
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

      <section className="glass-card rounded-xl p-5">
        <div className="mb-4">
          <h2 className="font-display text-xl font-bold">
            {locale === "he" ? "בחירות שלבי הנוקאאוט" : "Knockout Stage Picks"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-fg-muted)]">
            {locale === "he"
              ? "צפה בבחירות של כל משתתף בשלבי הנוקאאוט."
              : "Review each member's knockout picks by stage."}
          </p>
        </div>

        <div className="space-y-4 md:hidden">
          <MemberSelect
            locale={locale}
            members={members}
            selectedUserId={selectedMember?.userId ?? null}
            onChange={setSelectedUserId}
          />
          {selectedMember ? (
            <MobileKnockoutPredictionCard
              locale={locale}
              member={selectedMember}
              stages={knockoutStageRows}
            />
          ) : null}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-[var(--color-panel-highest)] text-xs uppercase text-[var(--color-fg-muted)]">
              <tr>
                <th className="sticky start-0 z-10 bg-[var(--color-panel-highest)] px-3 py-3 text-start">
                  {locale === "he" ? "משתתף" : "Member"}
                </th>
                {knockoutStageRows.map((stage) => (
                  <th key={stage.stage} className="px-3 py-3 text-start">
                    {stageLabel(stage.stage, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {members.map((member) => (
                <tr key={member.userId} className="bg-[var(--color-panel-low)] align-top">
                  <th className="sticky start-0 z-10 bg-[var(--color-panel-low)] px-3 py-3 text-start font-display text-sm font-bold">
                    {member.name}
                  </th>
                  {knockoutStageRows.map((stage) => {
                    const prediction = findPrediction(stage, member.userId);
                    return (
                      <td key={`${member.userId}-${stage.stage}`} className="min-w-44 px-3 py-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <StatusPill prediction={prediction} expected={stage.expected} locale={locale} />
                          {prediction?.randomPick ? <RandomPickBadge locale={locale} /> : null}
                        </div>
                        <PickList picks={prediction?.picks ?? []} locale={locale} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MemberSelect({
  locale,
  members,
  selectedUserId,
  onChange,
}: {
  locale: Locale;
  members: Member[];
  selectedUserId: number | null;
  onChange: (userId: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase text-[var(--color-fg-muted)]">
        {locale === "he" ? "משתתף" : "Member"}
      </span>
      <select
        value={selectedUserId ?? ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-3 py-3 text-sm font-bold text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
      >
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function MobileR32PredictionCard({
  locale,
  member,
  prediction,
  revealed,
}: {
  locale: Locale;
  member: Member;
  prediction: MobileLeagueStagePrediction | undefined;
  revealed: boolean;
}) {
  const memberPicks = revealed ? prediction?.picks ?? [] : [];

  return (
    <article className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MemberName member={member} randomPick={Boolean(prediction?.randomPick)} locale={locale} />
      </div>
      <div className="mt-3">
        <StatusPill prediction={prediction} expected={32} locale={locale} />
      </div>

      {revealed ? (
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

function MobileKnockoutPredictionCard({
  locale,
  member,
  stages,
}: {
  locale: Locale;
  member: Member;
  stages: MobileLeaguePredictionStage[];
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
      <h3 className="font-display text-base font-bold">{member.name}</h3>
      <div className="mt-4 grid gap-3">
        {stages.map((stage) => {
          const prediction = findPrediction(stage, member.userId);
          return (
            <div key={stage.stage} className="rounded-lg bg-[var(--color-panel-highest)] p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-[var(--color-fg-muted)]">
                  {stageLabel(stage.stage, locale)}
                </span>
                {prediction?.randomPick ? <RandomPickBadge locale={locale} /> : null}
              </div>
              <StatusPill prediction={prediction} expected={stage.expected} locale={locale} />
              <div className="mt-3">
                <PickList picks={prediction?.picks ?? []} locale={locale} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function MemberName({
  member,
  randomPick,
  locale,
}: {
  member: Member;
  randomPick: boolean;
  locale: Locale;
}) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{member.name}</span>
      {randomPick ? <RandomPickBadge locale={locale} /> : null}
    </span>
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
  expected,
  locale,
}: {
  prediction: MobileLeagueStagePrediction | undefined;
  expected: number;
  locale: Locale;
}) {
  const picked = prediction?.picks.length ?? 0;
  const label = !prediction?.submitted
    ? t(locale, "common.missing")
    : t(locale, "common.revealed");

  return (
    <span className="rounded-full bg-[var(--color-panel-highest)] px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
      {label} · {picked}/{expected}
    </span>
  );
}

function GroupPickList({
  group,
  picks,
  locale,
}: {
  group: string;
  picks: MobileLeagueStagePick[];
  locale: Locale;
}) {
  const groupPicks = picks
    .map((pick) => ({ ...pick, team: getTeam(pick.teamId) }))
    .filter((pick): pick is MobileLeagueStagePick & { team: Team } =>
      Boolean(pick.team && pick.team.group === group),
    )
    .sort(
      (a, b) =>
        (a.groupRank ?? 99) - (b.groupRank ?? 99) ||
        (getTeamName(a.team, locale) ?? "").localeCompare(getTeamName(b.team, locale) ?? ""),
    );

  if (groupPicks.length === 0) {
    return <span className="text-[var(--color-fg-muted)]">-</span>;
  }

  return (
    <ol className="space-y-1">
      {groupPicks.map((pick) => (
        <li key={`${pick.teamId}-${pick.groupRank}`} className={pickClassName(pick.successful)}>
          <span className="me-1 font-bold">{pick.groupRank}.</span>
          <span className="font-bold">{pick.team.code}</span>
          <span className="ms-1 text-xs opacity-80">
            {getTeamName(pick.team, locale)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function PickList({
  picks,
  locale,
}: {
  picks: MobileLeagueStagePick[];
  locale: Locale;
}) {
  if (picks.length === 0) {
    return <span className="text-[var(--color-fg-muted)]">-</span>;
  }

  return (
    <ul className="space-y-1">
      {picks.map((pick) => (
        <li key={`${pick.teamId}-${pick.teamCode}`} className={pickClassName(pick.successful)}>
          <span className="font-bold">{pick.teamCode}</span>
          <span className="ms-1 text-xs opacity-80">{pickName(pick, locale)}</span>
        </li>
      ))}
    </ul>
  );
}

function findPrediction(
  stage: MobileLeaguePredictionStage | undefined,
  userId: number,
): MobileLeagueStagePrediction | undefined {
  return stage?.predictions.find((prediction) => prediction.userId === userId);
}

function pickName(pick: MobileLeagueStagePick, locale: Locale): string {
  return getTeamName(getTeam(pick.teamId), locale) ?? pick.teamName;
}

function pickClassName(successful: boolean | null): string {
  if (successful === true) return "whitespace-nowrap text-[var(--color-accent)]";
  if (successful === false) return "whitespace-nowrap text-[var(--color-danger)]";
  return "whitespace-nowrap text-[var(--color-fg-muted)]";
}

function stageLabel(stage: MobileLeaguePredictionStage["stage"], locale: Locale): string {
  const labels: Record<MobileLeaguePredictionStage["stage"], { en: string; he: string }> = {
    r32: { en: "Round of 32", he: "שלב 32 האחרונות" },
    r16: { en: "Round of 16", he: "שמינית גמר" },
    qf: { en: "Quarter-finals", he: "רבע גמר" },
    sf: { en: "Semi-finals", he: "חצי גמר" },
    final: { en: "Final", he: "גמר" },
    champion: { en: "Champion", he: "אלופה" },
  };
  return labels[stage][locale];
}
