"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { locales, type Locale } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

export function LanguageSelector() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;
    setBusy(true);
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <select
      value={locale}
      disabled={busy}
      onChange={(event) => void changeLocale(event.target.value as Locale)}
      className="rounded-lg border border-white/10 bg-[var(--color-panel-highest)] px-2 py-2 text-xs font-bold text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)] disabled:opacity-60"
      aria-label={t("locale.label")}
      title={t("locale.label")}
    >
      {locales.map((option) => (
        <option key={option} value={option}>
          {option === "he" ? t("locale.hebrew") : t("locale.english")}
        </option>
      ))}
    </select>
  );
}
