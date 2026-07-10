import { toISODate } from "./date";

/**
 * Weeks start on Monday (ISO-8601 style), matching how Float/most timesheet
 * tools lay out the grid. Everything here works in local time — never UTC —
 * for the same reason toISODate does: we don't want the week to roll over
 * at the wrong moment for users west of UTC.
 */

export function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function addWeeks(date: Date, amount: number): Date {
  return addDays(date, amount * 7);
}

/** Returns the 7 dates (Mon...Sun) belonging to the week that starts on weekStart. */
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

const WEEKDAY_LABEL = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const DAY_MONTH_LABEL = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});
const DAY_MONTH_YEAR_LABEL = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatWeekdayLabel(date: Date): string {
  return WEEKDAY_LABEL.format(date);
}

/** e.g. "30 Jun – 6 Jul 2026" or "30 Jun – 6 Jul" if within the same year. */
/**
 * Returns a 6-week (42 day) Monday-start grid covering the given month,
 * including the leading/trailing days from adjacent months — the classic
 * calendar-popover layout.
 */
export function getMonthGridDates(monthDate: Date): Date[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = getWeekStart(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const sameYear = weekStart.getFullYear() === new Date().getFullYear();

  const start = DAY_MONTH_LABEL.format(weekStart);
  const end = sameYear
    ? DAY_MONTH_LABEL.format(weekEnd)
    : DAY_MONTH_YEAR_LABEL.format(weekEnd);

  return `${start} – ${end}, ${weekEnd.getFullYear()}`;
}
