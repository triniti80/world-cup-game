import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";

const rounds = {
  en: [
    {
      name: "Round of 32",
      matches: ["Winner Group A vs Best third-place", "Runner-up Group B vs Runner-up Group C"],
    },
    { name: "Round of 16", matches: ["Winner R32 Match 1 vs Winner R32 Match 2"] },
    { name: "Quarter-finals", matches: ["TBD vs TBD"] },
    { name: "Semi-finals", matches: ["TBD vs TBD"] },
    { name: "Final", matches: ["TBD vs TBD"] },
  ],
  he: [
    {
      name: "שלב 32 האחרונות",
      matches: ["מנצחת בית א נגד אחת מהמקום השלישי", "סגנית בית ב נגד סגנית בית ג"],
    },
    { name: "שמינית גמר", matches: ["מנצחת משחק 1 ב-32 האחרונות נגד מנצחת משחק 2"] },
    { name: "רבע גמר", matches: ["טרם נקבע נגד טרם נקבע"] },
    { name: "חצי גמר", matches: ["טרם נקבע נגד טרם נקבע"] },
    { name: "גמר", matches: ["טרם נקבע נגד טרם נקבע"] },
  ],
};

export default async function BracketPage() {
  const locale = await readLocale();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">{t(locale, "nav.bracket")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-fg-muted)]">
          {locale === "he"
            ? "ניחושי הנוקאאוט יתקדמו דרך הבראקט הזה. כרגע מוצג מבנה הבראקט."
            : "Knockout picks will advance through this bracket. For now this shows the bracket structure."}
        </p>
      </div>

      <div className="hide-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {rounds[locale].map((round) => (
          <section key={round.name} className="min-w-64 lg:min-w-0">
            <h2 className="mb-3 font-display text-sm font-bold uppercase text-[var(--color-gold)]">
              {round.name}
            </h2>
            <div className="space-y-3">
              {round.matches.map((match) => (
                <div key={match} className="glass-card min-h-28 rounded-xl p-4">
                  <div className="font-display text-sm font-bold">{match}</div>
                  <div className="mt-4 rounded-lg bg-[var(--color-panel-highest)] px-3 py-2 text-xs text-[var(--color-fg-muted)]">
                    {locale === "he" ? "פקדי בחירה יתווספו עם הניחושים השמורים." : "Pick controls coming with saved predictions."}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
