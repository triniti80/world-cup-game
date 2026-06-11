import Link from "next/link";
import { LeaguePredictionsMatchList } from "@/components/LeaguePredictionsMatchList";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import { readActiveLeagueId, readSession } from "@/lib/session";
import { getTeam, getTeamName, teams, type Team } from "@/lib/world-cup/data";
import { getLeaguePredictionVisibility, type LeagueR32Prediction } from "@/lib/world-cup/repository";

const groups = Array.from(new Set(teams.map((team) => team.group))).sort();

export default async function LeaguePredictionsPage() {
  const locale = await readLocale();
  const session = await readSession();
  const activeLeagueId = await readActiveLeagueId();
  const { league, members, matches, bonuses, stagePredictions } = session
    ? await getLeaguePredictionVisibility(session.userId, activeLeagueId)
    : { league: null, members: [], matches: [], bonuses: [], stagePredictions: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t(locale, "leaguePredictions.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          {t(locale, "leaguePredictions.body")}
        </p>
      </div>

      {!league ? (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold">{t(locale, "common.noActiveLeague")}</h2>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            {t(locale, "leaguePredictions.noLeagueBody")}
          </p>
          <Link
            href="/leagues"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-[#102000] glow-lime"
          >
            {t(locale, "common.goToLeagues")}
          </Link>
        </div>
      ) : (
        <section className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
          <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">{t(locale, "common.activeLeague")}</div>
          <div className="mt-1 font-display text-lg font-bold">{league.leagueName}</div>
          <div className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {league.gameMode === "match_scores"
              ? t(locale, "app.matchScores")
              : t(locale, "app.stagePredictions")}
          </div>
        </section>
      )}

      {league ? (
        <>
          <section className="glass-card rounded-xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">{t(locale, "leaguePredictions.bonusPicks")}</h2>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  {t(locale, "leaguePredictions.bonusHidden")}
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-gold)]/15 px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
                {t(locale, "predictions.pointsEach")}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {members.map((member) => {
                const bonus = bonuses.find((row) => row.userId === member.userId);
                return (
                  <article
                    key={member.userId}
                    className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4"
                  >
                    <h3 className="font-display text-base font-bold">{member.name}</h3>
                    <div className="mt-3 grid gap-2 text-sm">
                      <VisibilityRow
                        label={locale === "he" ? "מלך השערים" : "Top scorer"}
                        submitted={Boolean(bonus?.topScorerSubmitted)}
                        revealed={Boolean(bonus?.topScorerRevealed)}
                        value={bonus?.topScorer}
                        missingLabel={t(locale, "common.missing")}
                        submittedLabel={t(locale, "common.submitted")}
                      />
                      {league.gameMode === "match_scores" ? (
                        <VisibilityRow
                          label={locale === "he" ? "אלופה" : "Champion"}
                          submitted={Boolean(bonus?.winnerSubmitted)}
                          revealed={Boolean(bonus?.winnerRevealed)}
                          value={getTeamName(getTeam(bonus?.winnerTeamId), locale)}
                          missingLabel={t(locale, "common.missing")}
                          submittedLabel={t(locale, "common.submitted")}
                        />
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {league.gameMode === "match_scores" ? (
            <LeaguePredictionsMatchList locale={locale} members={members} matches={matches} />
          ) : (
            <RoundOf32PredictionsTable
              locale={locale}
              members={members}
              predictions={stagePredictions}
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function RoundOf32PredictionsTable({
  locale,
  members,
  predictions,
}: {
  locale: "en" | "he";
  members: { userId: number; name: string }[];
  predictions: LeagueR32Prediction[];
}) {
  const predictionByUserId = new Map(predictions.map((prediction) => [prediction.userId, prediction]));
  const revealed = predictions.some((prediction) => prediction.revealed);

  return (
    <section className="glass-card rounded-xl p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">
            {t(locale, "leaguePredictions.r32Title")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-fg-muted)]">
            {revealed ? t(locale, "leaguePredictions.r32Body") : t(locale, "leaguePredictions.r32Hidden")}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
          {t(locale, "stage.r32")}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
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
                    {member.name}
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

function StatusPill({
  prediction,
  locale,
}: {
  prediction: LeagueR32Prediction | undefined;
  locale: "en" | "he";
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
  locale: "en" | "he";
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

function VisibilityRow({
  label,
  submitted,
  revealed,
  value,
  missingLabel,
  submittedLabel,
}: {
  label: string;
  submitted: boolean;
  revealed: boolean;
  value?: string;
  missingLabel: string;
  submittedLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-panel-highest)] px-3 py-2">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className="font-bold text-[var(--color-accent)]">
        {!submitted ? missingLabel : revealed ? value ?? submittedLabel : submittedLabel}
      </span>
    </div>
  );
}
