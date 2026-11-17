"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

import { PlanningUnit } from "@/hooks/usePlanning";
import { useShownMonth } from "@/hooks/useShownMonth";
import { useShownWeek } from "@/hooks/useShownWeek";

const VIEW_PARAM = "view";
// The keys `useShownWeek` and `useShownMonth` keep their period in.
const WEEK_PARAM = "week";
const MONTH_PARAM = "month";

/**
 * Which period Planning shows. It opens on the month (`?month=`, the current
 * one without it), since a month is what gets planned; `?view=week` shows the
 * week, and a link with `?week=` still opens that week.
 */
export function usePlanningPeriod() {
  const searchParams = useSearchParams();
  const { weekStart, showWeekOf } = useShownWeek();
  const { month, currentMonth, showMonth } = useShownMonth({
    allowFuture: true,
  });

  const unit: PlanningUnit =
    searchParams.get(VIEW_PARAM) === "week" || searchParams.has(WEEK_PARAM)
      ? "week"
      : "month";

  // Through the history API, as the shown week and month are.
  const openWeek = useCallback(
    (day: Date) => {
      const url = new URL(window.location.href);
      url.searchParams.set(VIEW_PARAM, "week");
      url.searchParams.delete(MONTH_PARAM);
      window.history.replaceState(null, "", url);
      showWeekOf(day);
    },
    [showWeekOf],
  );

  const openMonth = useCallback(
    (monthKey: string) => {
      const url = new URL(window.location.href);
      url.searchParams.delete(VIEW_PARAM);
      url.searchParams.delete(WEEK_PARAM);
      window.history.replaceState(null, "", url);
      showMonth(monthKey);
    },
    [showMonth],
  );

  return { unit, weekStart, month, currentMonth, openWeek, openMonth };
}
