import { t, type Locale } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import {
  formatKickoff,
  getTeam,
  getTeamName,
  stageLabel,
  type Stage,
  type Team,
} from "@/lib/world-cup/data";
import {
  getSeededMatchesWithResults,
  type SeededMatchWithResult,
} from "@/lib/world-cup/repository";

const BRACKET_STAGES = ["r32", "r16", "qf", "sf", "final"] as const;

type BracketStage = (typeof BRACKET_STAGES)[number];
type MatchSide = "home" | "away";
type Entrant = {
  label: string;
  code?: string;
  flag?: string;
  isPlaceholder: boolean;
};

export default async function BracketPage() {
  const locale = await readLocale();
  const matches = await getSeededMatchesWithResults();
  const knockoutMatches = matches.filter(isBracketMatch).sort((a, b) => a.number - b.number);
  const thirdPlaceMatch = matches.find((match) => match.stage === "third");
  const matchByNumber = new Map(matches.map((match) => [match.number, match]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t(locale, "nav.bracket")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          {locale === "he"
            ? "הבראקט מתעדכן מהמשחקים האמיתיים. מצייני מקום מוחלפים בקבוצות ברגע שהתוצאה ידועה."
            : "The bracket is filled from the real fixtures. Placeholders are replaced by teams once results are known."}
        </p>
      </div>

      <div className="hide-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0 xl:grid xl:grid-cols-5 xl:overflow-visible">
        {BRACKET_STAGES.map((stage) => {
          const stageMatches = knockoutMatches.filter((match) => match.stage === stage);
          return (
            <section key={stage} className="min-w-72 xl:min-w-0">
              <h2 className="mb-3 font-display text-sm font-bold uppercase text-[var(--color-gold)]">
                {stageLabel(stage, locale)}
              </h2>
              <div className="space-y-3">
                {stageMatches.map((match) => (
                  <BracketMatchCard
                    key={match.id}
                    locale={locale}
                    match={match}
                    matchByNumber={matchByNumber}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {thirdPlaceMatch ? (
        <section className="max-w-md">
          <h2 className="mb-3 font-display text-sm font-bold uppercase text-[var(--color-gold)]">
            {stageLabel("third", locale)}
          </h2>
          <BracketMatchCard
            locale={locale}
            match={thirdPlaceMatch}
            matchByNumber={matchByNumber}
          />
        </section>
      ) : null}
    </div>
  );
}

function BracketMatchCard({
  locale,
  match,
  matchByNumber,
}: {
  locale: Locale;
  match: SeededMatchWithResult;
  matchByNumber: Map<number, SeededMatchWithResult>;
}) {
  const winnerSide = getEffectiveWinnerSide(match);
  const home = resolveEntrant(matchByNumber, match.homeTeamId, match.homePlaceholder, locale);
  const away = resolveEntrant(matchByNumber, match.awayTeamId, match.awayPlaceholder, locale);
  const hasScore = match.homeScore !== undefined && match.awayScore !== undefined;

  return (
    <article className="glass-card rounded-xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase text-[var(--color-fg-muted)]">
            {t(locale, "common.match")} {match.number}
          </div>
          <h3 className="mt-1 font-display text-sm font-bold text-[var(--color-fg)]">
            {home.label} {t(locale, "common.vs")} {away.label}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-panel-highest)] px-3 py-1 text-xs font-bold text-[var(--color-gold)]">
          {t(locale, `status.${match.status}`)}
        </span>
      </div>

      <div className="space-y-2">
        <EntrantRow
          entrant={home}
          score={hasScore ? match.homeScore : undefined}
          winner={winnerSide === "home"}
        />
        <div className="text-center text-xs font-bold uppercase text-[var(--color-fg-muted)]">
          {t(locale, "common.vs")}
        </div>
        <EntrantRow
          entrant={away}
          score={hasScore ? match.awayScore : undefined}
          winner={winnerSide === "away"}
        />
      </div>

      <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 text-xs text-[var(--color-fg-muted)]">
        <div className="flex justify-between gap-3">
          <span>{t(locale, "match.kickoff")}</span>
          <span className="text-end font-semibold text-[var(--color-fg)]">
            {formatKickoff(match.kickoffAtUtc, locale)}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span>{t(locale, "match.venue")}</span>
          <span className="max-w-44 text-end">{match.venue}</span>
        </div>
      </div>
    </article>
  );
}

function EntrantRow({
  entrant,
  score,
  winner,
}: {
  entrant: Entrant;
  score?: number;
  winner: boolean;
}) {
  return (
    <div
      className={[
        "flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
        winner
          ? "border-[var(--color-accent)] bg-[rgba(132,231,34,0.12)] text-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-panel-highest)] text-[var(--color-fg)]",
        entrant.isPlaceholder ? "text-[var(--color-fg-muted)]" : "",
      ].join(" ")}
    >
      <span className="min-w-0 truncate">
        {entrant.flag ? <span className="me-2">{entrant.flag}</span> : null}
        {entrant.code ? <span className="me-2 font-bold">{entrant.code}</span> : null}
        <span>{entrant.label}</span>
      </span>
      {score !== undefined ? <span className="font-display text-lg font-extrabold">{score}</span> : null}
    </div>
  );
}

function resolveEntrant(
  matchByNumber: Map<number, SeededMatchWithResult>,
  teamId: string | undefined,
  placeholder: string | undefined,
  locale: Locale,
  seen = new Set<string>(),
): Entrant {
  const team = getTeam(teamId);
  if (team) return teamEntrant(team, locale);

  if (placeholder) {
    const sourceMatch = getSourceMatch(matchByNumber, placeholder);
    if (sourceMatch && !seen.has(placeholder)) {
      const side = getPlaceholderResolvedSide(placeholder, sourceMatch);
      if (side) {
        seen.add(placeholder);
        return resolveEntrant(
          matchByNumber,
          side === "home" ? sourceMatch.homeTeamId : sourceMatch.awayTeamId,
          side === "home" ? sourceMatch.homePlaceholder : sourceMatch.awayPlaceholder,
          locale,
          seen,
        );
      }
    }
    return { label: placeholder, isPlaceholder: true };
  }

  return { label: t(locale, "common.tbd"), isPlaceholder: true };
}

function teamEntrant(team: Team, locale: Locale): Entrant {
  return {
    label: getTeamName(team, locale) ?? team.name,
    code: team.code,
    flag: team.flag,
    isPlaceholder: false,
  };
}

function getSourceMatch(
  matchByNumber: Map<number, SeededMatchWithResult>,
  placeholder: string,
): SeededMatchWithResult | undefined {
  const matchNumber = Number(placeholder.replace(/^RU|^W/, ""));
  if (!Number.isFinite(matchNumber)) return undefined;
  return matchByNumber.get(matchNumber);
}

function getPlaceholderResolvedSide(
  placeholder: string,
  sourceMatch: SeededMatchWithResult,
): MatchSide | null {
  const winnerSide = getEffectiveWinnerSide(sourceMatch);
  if (placeholder.startsWith("W")) return winnerSide;
  if (placeholder.startsWith("RU") && winnerSide) {
    return winnerSide === "home" ? "away" : "home";
  }
  return null;
}

function getEffectiveWinnerSide(match: SeededMatchWithResult): MatchSide | null {
  if (match.winnerSide) return match.winnerSide;
  if (match.homeScore === undefined || match.awayScore === undefined) return null;
  if (match.homeScore > match.awayScore) return "home";
  if (match.awayScore > match.homeScore) return "away";
  return null;
}

function isBracketMatch(match: SeededMatchWithResult): match is SeededMatchWithResult & {
  stage: BracketStage;
} {
  return (BRACKET_STAGES as readonly Stage[]).includes(match.stage);
}
