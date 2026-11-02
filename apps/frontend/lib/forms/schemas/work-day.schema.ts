import { z } from "zod";

/**
 * A working day, a person's or the company's standard one: whole half-hours up
 * to 12h, so the day expected and planned is never an odd minute (decision 6,
 * Phase 41). A week is five of them.
 */
export const MAX_WORK_DAY_HOURS = 12;
export const WORK_DAY_STEP_HOURS = 0.5;
export const WORK_DAYS_PER_WEEK = 5;

/** A person's week, as the API stores it, from the hours in their day. */
export const minutesPerWeekOf = (hoursPerDay: number) =>
  Math.round(hoursPerDay * 60) * WORK_DAYS_PER_WEEK;

/** The day in a stored week, in whole minutes for showing. */
export const minutesPerDayOf = (minutesPerWeek: number) =>
  Math.round(minutesPerWeek / WORK_DAYS_PER_WEEK);

const isWorkDayStep = (hours: number) =>
  Number.isInteger(hours / WORK_DAY_STEP_HOURS);

/**
 * Hours in a working day; `kept` is a value saved before these limits, such as
 * 4.8 or 14, accepted unchanged so the rest of the form can still be saved.
 */
export const workDayHoursSchema = (min: number, kept?: number) => {
  const isKept = (hours: number) => hours === kept;

  return z
    .number({ error: "Enter the hours in a working day" })
    .refine((hours) => isKept(hours) || hours >= min, {
      message: `A working day is at least ${min}h`,
    })
    .refine((hours) => isKept(hours) || hours <= MAX_WORK_DAY_HOURS, {
      message: `A working day is at most ${MAX_WORK_DAY_HOURS}h`,
    })
    .refine((hours) => isKept(hours) || isWorkDayStep(hours), {
      message: "Use 30-minute steps, such as 6 or 6.5",
    });
};
