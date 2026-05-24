import { LanguageSelector } from "@/components/LanguageSelector";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/i18n-server";
import { readSession } from "@/lib/session";
import { LoginForm } from "./form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await readSession();
  const locale = await readLocale();
  if (session) {
    const { next } = await searchParams;
    redirect(next && next.startsWith("/") ? next : "/");
  }

  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="glass-card rounded-xl p-6">
        <div className="mb-4 flex justify-end">
          <LanguageSelector />
        </div>
        <p className="text-sm font-bold uppercase text-[var(--color-gold)]">WC2026 Friends Pool</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">{t(locale, "auth.signIn")}</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          {locale === "he"
            ? "הזן אימייל וסיסמה כדי לפתוח את דשבורד הניחושים שלך."
            : "Enter your email and password to open your predictions dashboard."}
        </p>
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
