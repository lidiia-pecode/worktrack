"use client";

import { useMemo, useState } from "react";

import { companyToday, getWeekStart } from "@/lib/utils/date";

import { useWorkSettings } from "./useWorkSettings";

/**
 * The week a week grid shows. Until somebody moves it, it follows the
 * company's today rather than the browser's, so it lands on the right week
 * once the company's time zone has loaded.
 */
export function useShownWeek() {
  const { weekStartDay, timezone } = useWorkSettings();
  const [chosenDate, setChosenDate] = useState<Date | null>(null);

  const weekStart = useMemo(
    () => getWeekStart(chosenDate ?? companyToday(timezone), weekStartDay),
    [chosenDate, timezone, weekStartDay],
  );

  return { weekStart, showWeekOf: setChosenDate };
}
