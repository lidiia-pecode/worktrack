"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import {
  fromISODate,
  getWeekStart,
  isISODate,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";

import { useWorkSettings } from "./useWorkSettings";

const WEEK_PARAM = "week";

// A day like 2026-02-31 rolls over to March, so it must read back the same.
const isRealDay = (day: string) =>
  isISODate(day) && toISODate(fromISODate(day)) === day;

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
 * from a link, shows its week instead; one that isn't a real date is ignored,
 * and the link's `?week=` leaves the URL once somebody moves, so a reload
 * doesn't take them back to it.
 */
export function useShownWeek(startingDay?: string | null) {
  const { weekStartDay, timezone } = useWorkSettings();
  const [chosenDate, setChosenDate] = useState<Date | null>(() =>
    startingDay && isRealDay(startingDay) ? fromISODate(startingDay) : null,
  );

  // Through the history API, as the side panels do, so the page isn't
  // rendered again from the server.
  const showWeekOf = useCallback((date: Date) => {
    setChosenDate(date);

    const url = new URL(window.location.href);
    if (url.searchParams.has(WEEK_PARAM)) {
      url.searchParams.delete(WEEK_PARAM);
      window.history.replaceState(null, "", url);
    }
  }, []);

  const readToday = () => todayISODate(timezone);
  const today = useSyncExternalStore(subscribeToReturns, readToday, readToday);

  const weekStart = useMemo(
    () =>
      getWeekStart(chosenDate ?? new Date(`${today}T00:00:00`), weekStartDay),
    [chosenDate, today, weekStartDay],
  );

  return { weekStart, showWeekOf };
}
