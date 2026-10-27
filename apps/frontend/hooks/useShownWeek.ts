"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

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
 * The week a week grid shows, kept in `?week=` (any day of it, as links such
 * as My time's give it). Without one it follows the company's today rather
 * than the browser's, so it lands on the right week once the company's time
 * zone has loaded, and moves on to a new week when somebody comes back to a
 * tab left open past the old one. A day that isn't a real date is ignored.
 *
 * The URL is the only record of a chosen week, so a reload, a link and the
 * sidebar's plain link all show the week the address names. A move back to
 * the current week removes it, so the page follows today again.
 */
export function useShownWeek() {
  const { weekStartDay, timezone } = useWorkSettings();
  const searchParams = useSearchParams();
  const linkedDay = searchParams.get(WEEK_PARAM);
  const chosenDay = linkedDay && isRealDay(linkedDay) ? linkedDay : null;

  const readToday = () => todayISODate(timezone);
  const today = useSyncExternalStore(subscribeToReturns, readToday, readToday);

  // Through the history API, as the side panels do, so the page isn't
  // rendered again from the server.
  const showWeekOf = useCallback(
    (date: Date) => {
      const firstDay = toISODate(getWeekStart(date, weekStartDay));
      const thisWeekFirstDay = toISODate(
        getWeekStart(fromISODate(today), weekStartDay),
      );

      const url = new URL(window.location.href);
      if (firstDay === thisWeekFirstDay) url.searchParams.delete(WEEK_PARAM);
      else url.searchParams.set(WEEK_PARAM, firstDay);
      window.history.replaceState(null, "", url);
    },
    [today, weekStartDay],
  );

  const weekStart = useMemo(
    () =>
      getWeekStart(
        chosenDay ? fromISODate(chosenDay) : new Date(`${today}T00:00:00`),
        weekStartDay,
      ),
    [chosenDay, today, weekStartDay],
  );

  return { weekStart, showWeekOf };
}
