import { WeekDay } from "@/types/enums";

/**
 * Which weekday a week starts on is a workspace setting (Company.weekStartDay),
 * so the helpers here take it as an argument and default to Monday (ISO-8601),
 * which is what the grid used before the setting existed.
 *
 * Everything works in local time — never UTC — because we don't want the week
 * to roll over at the wrong moment for users west of UTC. The exception is the
 * "today" comparison, which can be pinned to the workspace timezone.
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
 * Today in the workspace timezone. Falls back to the viewer's local date when
 * no timezone is configured, or when the stored value is not a valid IANA name.
 */
export function todayISODate(timeZone?: string): string {
  if (!timeZone) {
    return toISODate(new Date());
  }

  try {
    // en-CA formats as YYYY-MM-DD, which matches toISODate.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return toISODate(new Date());
  }
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
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

/** Returns the 7 dates of the week beginning at weekStart. */
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
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
 * TODO: Company has no "working days" setting, so a workspace with a different
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

/** e.g. "30 Jun – 6 Jul 2026" or "30 Jun – 6 Jul" if within the same year. */
/**
 * Returns a 6-week (42 day) grid covering the given month, including the
 * leading/trailing days from adjacent months — the classic calendar-popover
 * layout.
 */
export function getMonthGridDates(
  monthDate: Date,
  weekStartDay: WeekDay = WeekDay.MONDAY,
): Date[] {
  const firstOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const gridStart = getWeekStart(firstOfMonth, weekStartDay);
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
