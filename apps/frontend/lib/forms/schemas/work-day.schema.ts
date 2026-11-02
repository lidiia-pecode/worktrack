import { z } from "zod";

/**
 * A working day, a person's or the company's standard one: whole half-hours up
 * to 12h, so the day expected and planned is never an odd minute (decision 6,
 * Phase 41). A week is five of them.
 */
export const MAX_WORK_DAY_HOURS = 12;
export const WORK_DAY_STEP_HOURS = 0.5;
export const WORK_DAYS_PER_WEEK = 5;

const isWorkDayStep = (hours: number) =>
  Number.isInteger(hours / WORK_DAY_STEP_HOURS);

/** Hours in a working day; `kept` is a saved value from before the steps, accepted unchanged. */
export const workDayHoursSchema = (min: number, kept?: number) =>
  z
    .number({ error: "Enter the hours in a working day" })
    .min(min, `A working day is at least ${min}h`)
    .max(MAX_WORK_DAY_HOURS, `A working day is at most ${MAX_WORK_DAY_HOURS}h`)
    .refine((hours) => hours === kept || isWorkDayStep(hours), {
      message: "Use 30-minute steps, such as 6 or 6.5",
    });
