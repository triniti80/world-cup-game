import type { Metadata } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { dirForLocale } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import "./globals.css";

// Every page in this single-tenant app depends on DB state — nothing should
// be statically pre-rendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "World Cup Pool",
  description: "Private World Cup prediction game for friends.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await readLocale();
  return (
    <html lang={locale} dir={dirForLocale(locale)}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
