"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

const lastHourMs = 60 * 60 * 1000;

export function LockCountdown({
  targetAtUtc,
  serverNowUtc,
}: {
  targetAtUtc: string;
  serverNowUtc: string;
}) {
  const { t } = useI18n();
  const targetTime = new Date(targetAtUtc).getTime();
  const serverNowTime = new Date(serverNowUtc).getTime();
  const [remainingMs, setRemainingMs] = useState(() => targetTime - serverNowTime);

  useEffect(() => {
    const update = () => setRemainingMs(targetTime - Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [targetTime]);

  return (
    <div className="mt-2 rounded-lg bg-[var(--color-panel-highest)] px-3 py-2">
      <div className="text-[10px] font-bold uppercase text-[var(--color-fg-muted)]">
        {t("dashboard.locksIn")}
      </div>
      <div className="mt-1 font-display text-xl font-extrabold text-[var(--color-gold)]">
        {formatRemaining(remainingMs, t)}
      </div>
    </div>
  );
}

function formatRemaining(
  remainingMs: number,
  translate: ReturnType<typeof useI18n>["t"],
): string {
  if (remainingMs <= 0) return translate("dashboard.locked");

  const totalSeconds = Math.ceil(remainingMs / 1000);

  if (remainingMs <= lastHourMs) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}${translate("dashboard.minutesShort")} ${seconds}${translate("dashboard.secondsShort")}`;
  }

  const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  return `${days}${translate("dashboard.daysShort")} ${hours}${translate("dashboard.hoursShort")} ${minutes}${translate("dashboard.minutesShort")}`;
}
