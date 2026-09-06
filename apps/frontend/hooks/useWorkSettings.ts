"use client";

import { WeekDay } from "@/types/enums";

import { useCompany } from "./auth/useCompany";

/**
 * Used until the workspace settings have loaded, and for the rare case where a
 * company record is missing a value. They mirror the backend column defaults.
 */
export const DEFAULT_WEEK_START_DAY = WeekDay.MONDAY;
export const DEFAULT_WORK_HOURS_PER_DAY = 8;

/**
 * Workspace calendar and capacity settings, in the shape the timesheet needs.
 * Keeps the mapping from Company fields in one place so views do not each
 * repeat the hours-to-minutes conversion or the fallbacks.
 */
export function useWorkSettings() {
  const { company, query } = useCompany();

  const workHoursPerDay =
    company?.standardWorkHoursPerDay ?? DEFAULT_WORK_HOURS_PER_DAY;

  return {
    weekStartDay: company?.weekStartDay ?? DEFAULT_WEEK_START_DAY,
    dailyTargetMinutes: Math.round(workHoursPerDay * 60),
    timezone: company?.timezone,
    isLoading: query.isLoading,

    isError: query.isError,
    refetch: query.refetch,
  };
}
