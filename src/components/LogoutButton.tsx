"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "./I18nProvider";

export function LogoutButton() {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[var(--color-fg-muted)] transition hover:bg-[var(--color-panel-high)] hover:text-[var(--color-fg)] disabled:opacity-60"
    >
      {busy ? "..." : t("logout.signOut")}
    </button>
  );
}
