import Link from "next/link";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";

const content = {
  en: {
    intro:
      "Each league chooses one game option: pre-tournament stage picks or match score guessing. Bonus picks, locks, visibility, and leaderboard points follow that league option.",
    quickStart: [
      "Create an account or sign in.",
      "Create a league or join one with an invite code.",
      "Check the active league on My Predictions.",
      "Make the picks allowed by that league's game option before they lock.",
      "Follow League Picks and the Leaderboard as predictions reveal and scores are entered.",
    ],
    stageTitle: "Option 1: Stage Prediction League",
    stageBody:
      "Before the World Cup starts, pick the teams you think will reach each tournament stage. For the Round of 32, choose 1st and 2nd place in every group, plus only 8 third-place teams. Later rounds are selected from your previous saved picks.",
    scoreTitle: "Option 2: Match Score League",
    scoreBody:
      "Enter a home and away score for each fixture before that match locks. Predictions are for the score after 90 minutes, including stoppage time, not extra time or penalties. Correct outcome earns 2 points. Exact score earns 5 points total. Knockout draws must include the team you think advances.",
    locksTitle: "Locks and Visibility",
    locksBody:
      "Pre-tournament picks lock 1 hour before Match 1. Each score prediction locks 5 minutes before kickoff. Score guesses reveal when the match starts; pre-tournament picks reveal after the first match starts.",
    correctionsTitle: "Leaderboard and Corrections",
    correctionsBody:
      "The leaderboard is recalculated from saved scoring events after admins enter official results. If a fixture or result looks wrong, ask an admin to correct it in Settings.",
    usefulPages: "Useful Pages",
    scoring: "Scoring",
    matchScores: "Match scores",
    stagePicks: "Stage picks",
  },
  he: {
    intro:
      "כל ליגה בוחרת סוג משחק אחד: ניחושי שלבים לפני הטורניר או ניחוש תוצאות משחקים. הבונוסים, הנעילות, החשיפה והניקוד בטבלה נקבעים לפי סוג המשחק של הליגה.",
    quickStart: [
      "צור חשבון או התחבר.",
      "צור ליגה או הצטרף עם קוד הזמנה.",
      "בדוק את הליגה הפעילה בעמוד הניחושים שלי.",
      "בצע את הניחושים שמתאימים לסוג המשחק של הליגה לפני שהם ננעלים.",
      "עקוב אחרי ניחושי הליגה והטבלה כשהניחושים נחשפים והתוצאות מוזנות.",
    ],
    stageTitle: "אפשרות 1: ליגת ניחושי שלבים",
    stageBody:
      "לפני תחילת המונדיאל בוחרים אילו קבוצות יגיעו לכל שלב. ב-32 האחרונות בוחרים מקום ראשון ושני מכל בית, ועוד 8 קבוצות בלבד מהמקום השלישי. השלבים הבאים נבחרים מתוך הבחירות ששמרת בשלב הקודם.",
    scoreTitle: "אפשרות 2: ליגת ניחוש תוצאות",
    scoreBody:
      "מזינים תוצאת בית וחוץ לכל משחק לפני שהוא ננעל. הניחוש הוא לתוצאה אחרי 90 דקות, כולל תוספת זמן, ולא כולל הארכה או פנדלים. תוצאה בכיוון נכון נותנת 2 נקודות. תוצאה מדויקת נותנת 5 נקודות בסך הכל. בתיקו בנוקאאוט חייבים לבחור מי עולה.",
    locksTitle: "נעילות וחשיפה",
    locksBody:
      "ניחושי טרום-טורניר ננעלים שעה לפני משחק 1. כל ניחוש תוצאה ננעל 5 דקות לפני שריקת הפתיחה. ניחושי תוצאה נחשפים בתחילת המשחק; ניחושי טרום-טורניר נחשפים אחרי תחילת המשחק הראשון.",
    correctionsTitle: "טבלה ותיקונים",
    correctionsBody:
      "הטבלה מחושבת מחדש מאירועי ניקוד שמורים אחרי שמנהלים מזינים תוצאות רשמיות. אם משחק או תוצאה נראים לא נכונים, בקש ממנהל לתקן בהגדרות.",
    usefulPages: "עמודים שימושיים",
    scoring: "ניקוד",
    matchScores: "ניחושי תוצאה",
    stagePicks: "ניחושי שלבים",
  },
};

const stageScores = [
  ["stage.r32", "10"],
  ["stage.r16", "20"],
  ["stage.qf", "40"],
  ["stage.sf", "80"],
  ["stage.final", "120"],
] as const;

const usefulLinks = [
  ["/leagues", "nav.leagues"],
  ["/predictions", "nav.predictions"],
  ["/fixtures", "nav.fixtures"],
  ["/league-predictions", "nav.leaguePredictions"],
  ["/leaderboard", "nav.leaderboard"],
] as const;

export default async function InstructionsPage() {
  const locale = await readLocale();
  const copy = content[locale];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t(locale, "nav.instructions")}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-fg-muted)]">{copy.intro}</p>
      </div>

      <section className="glass-card rounded-xl p-5">
        <h2 className="font-display text-xl font-bold text-[var(--color-primary)]">
          {locale === "he" ? "התחלה מהירה" : "Quick Start"}
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-5">
          {copy.quickStart.map((step, index) => (
            <li key={step} className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
              <div className="font-display text-2xl font-extrabold text-[var(--color-accent)]">{index + 1}</div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-fg-muted)]">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title={copy.stageTitle} body={copy.stageBody} />
        <InfoCard title={copy.scoreTitle} body={copy.scoreBody} />
      </div>

      <section className="glass-card rounded-xl p-5">
        <h2 className="font-display text-xl font-bold text-[var(--color-primary)]">{copy.scoring}</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
            <h3 className="font-display text-base font-bold">{copy.matchScores}</h3>
            <div className="mt-3 divide-y divide-white/10 text-sm">
              <ScoreRow label={locale === "he" ? "כיוון נכון או תיקו" : "Correct winner or draw"} value={`2 ${t(locale, "common.pts")}`} />
              <ScoreRow label={locale === "he" ? "תוצאה מדויקת" : "Exact score"} value={`5 ${t(locale, "common.pts")}`} />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[var(--color-panel-low)] p-4">
            <h3 className="font-display text-base font-bold">{copy.stagePicks}</h3>
            <div className="mt-3 divide-y divide-white/10 text-sm">
              {stageScores.map(([label, value]) => (
                <ScoreRow key={label} label={t(locale, label)} value={`${value} ${t(locale, "common.pts")}`} />
              ))}
              <ScoreRow label={locale === "he" ? "אלופה" : "Champion"} value={`150 ${t(locale, "common.pts")}`} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title={copy.locksTitle} body={copy.locksBody} />
        <InfoCard title={copy.correctionsTitle} body={copy.correctionsBody} />
      </div>

      <section className="rounded-xl border border-[var(--color-gold)]/50 bg-[var(--color-panel-low)] p-5 glow-gold">
        <h2 className="font-display text-lg font-bold">{copy.usefulPages}</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {usefulLinks.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg bg-[var(--color-panel-highest)] px-4 py-2 font-bold text-[var(--color-gold)]">
              {t(locale, label)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className="text-end font-bold text-[var(--color-accent)]">{value}</span>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="glass-card rounded-xl p-5">
      <h2 className="font-display text-xl font-bold text-[var(--color-primary)]">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-[var(--color-fg-muted)]">{body}</p>
    </section>
  );
}
