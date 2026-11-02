import { PlanningWeekRow } from "@/types";

/** Plans are made in quarter hours, as the API requires (Phase 41). */
export const PLAN_MINUTE_STEP = 15;

export const isOnPlanStep = (minutes: number) =>
  minutes % PLAN_MINUTE_STEP === 0;

/** Down to the last whole step: the most a picker in steps can reach. */
export const toPlanStep = (minutes: number) =>
  Math.floor(minutes / PLAN_MINUTE_STEP) * PLAN_MINUTE_STEP;

/** The most the person can be planned on the date: their own day then. */
export const dayLimitOn = (row: PlanningWeekRow, date: string) =>
  row.dayLimits.find((day) => day.date === date)?.minutes ?? 0;
