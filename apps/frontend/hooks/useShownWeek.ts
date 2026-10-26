"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import {
  fromISODate,
  getWeekStart,
  isISODate,
  todayISODate,
} from "@/lib/utils/date";

import { useWorkSettings } from "./useWorkSettings";

const subscribeToReturns = (onReturn: () => void) => {
  document.addEventListener("visibilitychange", onReturn);
  window.addEventListener("focus", onReturn);

  return () => {
    document.removeEventListener("visibilitychange", onReturn);
    window.removeEventListener("focus", onReturn);
  };
};

/**
 * The week a week grid shows. Until somebody moves it, it follows the
 * company's today rather than the browser's, so it lands on the right week
 * once the company's time zone has loaded, and moves on to a new week when
 * somebody comes back to a tab left open past the old one. A starting day,
 * from a link, shows its week instead; one that isn't a date is ignored.
 */
export function useShownWeek(startingDay?: string | null) {
  const { weekStartDay, timezone } = useWorkSettings();
  const [chosenDate, setChosenDate] = useState<Date | null>(() =>
    startingDay &&
    isISODate(startingDay) &&
    !Number.isNaN(fromISODate(startingDay).getTime())
      ? fromISODate(startingDay)
      : null,
  );

  const readToday = () => todayISODate(timezone);
  const today = useSyncExternalStore(subscribeToReturns, readToday, readToday);

  const weekStart = useMemo(
    () =>
      getWeekStart(chosenDate ?? new Date(`${today}T00:00:00`), weekStartDay),
    [chosenDate, today, weekStartDay],
  );

  return { weekStart, showWeekOf: setChosenDate };
}
