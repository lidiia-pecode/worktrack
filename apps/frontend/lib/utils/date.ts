import { WeekDay } from "@/types/enums";

/**
 * Which weekday a week starts on is a company setting (Company.weekStartDay),
 * so the helpers here take it as an argument and default to Monday (ISO-8601),
 * which is what the grid used before the setting existed.
 *
 * Everything works in local time — never UTC — because we don't want the week
 * to roll over at the wrong moment for users west of UTC. The exception is the
 * "today" comparison, which can be pinned to the company's time zone.
 */
const WEEK_START_INDEX: Record<WeekDay, number> = {
  [WeekDay.SUNDAY]: 0,
  [WeekDay.MONDAY]: 1,
};

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * The calendar date of an instant in the company's time zone. Falls back to the
 * viewer's local date when no timezone is configured, or when the stored value
 * is not a valid IANA name.
 */
export function isoDateInTimeZone(instant: Date, timeZone?: string): string {
  if (!timeZone) {
    return toISODate(instant);
  }

  try {
    // en-CA formats as YYYY-MM-DD, which matches toISODate.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant);
  } catch {
    return toISODate(instant);
  }
}

/** Today in the company's time zone. */
export function todayISODate(timeZone?: string): string {
  return isoDateInTimeZone(new Date(), timeZone);
}

/** e.g. "1h 30m", "2h" or "45m"; zero reads "0h". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  if (hours === 0) {
    return `${mins}m`;
  }

  return `${hours}h ${mins}m`;
}

const HOURS_LABEL = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

/**
 * Whole hours for report figures, e.g. "1,203h", where minutes are noise;
 * under an hour stays in minutes ("45m").
 */
export function formatReportHours(minutes: number): string {
  if (minutes < 60) return formatDuration(minutes);

  return `${HOURS_LABEL.format(Math.round(minutes / 60))}h`;
}

export function getWeekStart(
  date: Date,
  weekStartDay: WeekDay = WeekDay.MONDAY,
): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() - WEEK_START_INDEX[weekStartDay] + 7) % 7;
  d.setDate(d.getDate() - offset);
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

/** The last day of the week beginning at weekStart. */
export function getWeekEnd(weekStart: Date): Date {
  return addDays(weekStart, 6);
}

/** Returns the 7 dates of the week beginning at weekStart. */
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Today in the company's time zone, as a local-midnight Date for the week grids. */
export function companyToday(timeZone?: string): Date {
  return new Date(`${todayISODate(timeZone)}T00:00:00`);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

export function isToday(date: Date, timeZone?: string): boolean {
  return toISODate(date) === todayISODate(timeZone);
}

/**
 * Saturday and Sunday. This is a calendar fact and stays fixed regardless of
 * which day the grid starts on.
 *
 * TODO: Company has no "working days" setting, so a company with a different
 * working week cannot be represented yet.
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
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

const LONG_DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** e.g. "Wednesday, September 23". */
export function formatLongDayLabel(date: Date): string {
  return LONG_DAY_LABEL.format(date);
}

const MONTH_YEAR_LABEL = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

/** The longest report range, both ends counted. The server refuses longer. */
export const MAX_REPORT_RANGE_DAYS = 366;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whether a date field holds a whole YYYY-MM-DD date, with a four-digit year. */
export function isISODate(value: string): boolean {
  return ISO_DATE.test(value);
}

/** Whether both fields hold whole dates, the last not before the first. */
export function isISODateRange(startDate: string, endDate: string): boolean {
  return isISODate(startDate) && isISODate(endDate) && endDate >= startDate;
}

/** The local midnight of a YYYY-MM-DD date; the inverse of `toISODate`. */
export function fromISODate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

/** The last day a report starting on dateFrom may end on. */
export function lastDayOfReportRange(dateFrom: string): string {
  const firstDay = new Date(`${dateFrom}T00:00:00`);
  return toISODate(addDays(firstDay, MAX_REPORT_RANGE_DAYS - 1));
}

/** The YYYY-MM month key of a YYYY-MM-DD date. */
export function toMonthKey(date: string): string {
  return date.slice(0, 7);
}

/** The YYYY-MM month key the given number of months after (or before) another. */
export function addMonthsToKey(monthKey: string, amount: number): string {
  const firstDay = new Date(`${monthKey}-01T00:00:00`);
  const shifted = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth() + amount,
    1,
  );

  return toMonthKey(toISODate(shifted));
}

/** The first and last day of a YYYY-MM month, as YYYY-MM-DD dates. */
export function getMonthRange(monthKey: string): {
  dateFrom: string;
  dateTo: string;
} {
  const firstDay = new Date(`${monthKey}-01T00:00:00`);
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);

  return { dateFrom: toISODate(firstDay), dateTo: toISODate(lastDay) };
}

/** e.g. "September 2026", from a YYYY-MM month key. */
export function formatMonthLabel(monthKey: string): string {
  return MONTH_YEAR_LABEL.format(new Date(`${monthKey}-01T00:00:00`));
}

/** e.g. "7 Oct 2026", from a YYYY-MM-DD date. */
export function formatDayMonthYearLabel(date: string): string {
  return DAY_MONTH_YEAR_LABEL.format(new Date(`${date}T00:00:00`));
}

/** e.g. "7 Oct", from a YYYY-MM-DD date. */
export function formatDayMonthLabel(date: string): string {
  return DAY_MONTH_LABEL.format(new Date(`${date}T00:00:00`));
}

/** The 1st of the month `monthsAhead` months from `date`'s month. */
export function firstOfMonth(date: Date, monthsAhead = 0): Date {
  return new Date(date.getFullYear(), date.getMonth() + monthsAhead, 1);
}

/**
 * Returns a 6-week (42 day) grid covering the given month, including the
 * leading/trailing days from adjacent months — the classic calendar-popover
 * layout.
 */
export function getMonthGridDates(
  monthDate: Date,
  weekStartDay: WeekDay = WeekDay.MONDAY,
): Date[] {
  const gridStart = getWeekStart(firstOfMonth(monthDate), weekStartDay);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** "Oct 19 – Oct 25": the week without its year, where room is short. */
export function formatShortWeekRangeLabel(weekStart: Date): string {
  return `${DAY_MONTH_LABEL.format(weekStart)} – ${DAY_MONTH_LABEL.format(getWeekEnd(weekStart))}`;
}

/** e.g. "30 Jun – 6 Jul, 2026", or "29 Dec 2026 – 4 Jan 2027" across a new year. */
export function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = getWeekEnd(weekStart);

  if (weekStart.getFullYear() !== weekEnd.getFullYear()) {
    return `${DAY_MONTH_YEAR_LABEL.format(weekStart)} – ${DAY_MONTH_YEAR_LABEL.format(weekEnd)}`;
  }

  return `${DAY_MONTH_LABEL.format(weekStart)} – ${DAY_MONTH_LABEL.format(weekEnd)}, ${weekEnd.getFullYear()}`;
}
