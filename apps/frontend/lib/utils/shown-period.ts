import { ReportRange } from "@/types";

import {
  addDays,
  addMonthsToKey,
  formatDateRangeLabel,
  formatMonthLabel,
  fromISODate,
  getMonthRange,
  isISODate,
  lastDayOfReportRange,
  toISODate,
  toMonthKey,
} from "./date";

/** How Reports chooses its period: a calendar month, quarter or year, or any range. */
export type PeriodUnit = "month" | "quarter" | "year" | "custom";

export interface ShownPeriod {
  unit: PeriodUnit;
  range: ReportRange;
}

export type CalendarUnit = Exclude<PeriodUnit, "custom">;

const MONTHS_PER_UNIT: Record<CalendarUnit, number> = {
  month: 1,
  quarter: 3,
  year: 12,
};

const MONTHS_PER_QUARTER = MONTHS_PER_UNIT.quarter;

/** The address parameter of each unit; a custom range uses `from` and `to`. */
export const PERIOD_PARAMS = ["month", "quarter", "year", "from", "to"];

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const QUARTER_KEY = /^(\d{4})-Q([1-4])$/;
const YEAR_KEY = /^\d{4}$/;

const shiftDate = (date: string, days: number) =>
  toISODate(addDays(fromISODate(date), days));

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Both ends counted; rounded, since a clock change makes a day 23 or 25 hours. */
const daysIn = ({ dateFrom, dateTo }: ReportRange) =>
  Math.round(
    (fromISODate(dateTo).getTime() - fromISODate(dateFrom).getTime()) /
      MS_PER_DAY,
  ) + 1;

/** A whole calendar date, so "2026-02-31" is refused rather than rolled into March. */
const isRealDate = (date: string) =>
  isISODate(date) && toISODate(fromISODate(date)) === date;

const quarterOf = (date: string) =>
  Math.floor((Number(date.slice(5, 7)) - 1) / MONTHS_PER_QUARTER) + 1;

/** The calendar month, quarter or year a date falls in. */
export const periodOf = (unit: CalendarUnit, date: string): ShownPeriod => {
  const months = MONTHS_PER_UNIT[unit];
  const monthIndex = Number(date.slice(5, 7)) - 1;
  const firstMonthIndex = Math.floor(monthIndex / months) * months;
  const firstMonth = `${date.slice(0, 4)}-${String(firstMonthIndex + 1).padStart(2, "0")}`;
  const lastMonth = addMonthsToKey(firstMonth, months - 1);

  return {
    unit,
    range: {
      dateFrom: getMonthRange(firstMonth).dateFrom,
      dateTo: getMonthRange(lastMonth).dateTo,
    },
  };
};

/** The period before or after: by its unit, or a custom range by its own length. */
export const stepPeriod = (
  { unit, range }: ShownPeriod,
  step: 1 | -1,
): ShownPeriod => {
  if (unit === "custom") {
    const days = step * daysIn(range);
    return {
      unit,
      range: {
        dateFrom: shiftDate(range.dateFrom, days),
        dateTo: shiftDate(range.dateTo, days),
      },
    };
  }

  const firstMonth = addMonthsToKey(
    toMonthKey(range.dateFrom),
    step * MONTHS_PER_UNIT[unit],
  );
  return periodOf(unit, getMonthRange(firstMonth).dateFrom);
};

/**
 * The period a new unit opens on. A larger unit holds the one shown; a smaller
 * one is its last part, but never past today, so a running year opens on the
 * current quarter or month. Custom starts from the dates shown.
 */
export const switchUnit = (
  period: ShownPeriod,
  unit: PeriodUnit,
  today: string,
): ShownPeriod => {
  if (unit === "custom") return { unit, range: period.range };

  const isLarger =
    period.unit !== "custom" &&
    MONTHS_PER_UNIT[unit] >= MONTHS_PER_UNIT[period.unit];
  const lastShownDay =
    period.range.dateTo < today ? period.range.dateTo : today;

  return periodOf(unit, isLarger ? period.range.dateFrom : lastShownDay);
};

export const containsDate = ({ dateFrom, dateTo }: ReportRange, date: string) =>
  dateFrom <= date && date <= dateTo;

/** "October 2026", "Q3 2026", "2026", or a custom range's dates. */
export const periodLabel = ({ unit, range }: ShownPeriod) => {
  const year = range.dateFrom.slice(0, 4);

  switch (unit) {
    case "month":
      return formatMonthLabel(toMonthKey(range.dateFrom));
    case "quarter":
      return `Q${quarterOf(range.dateFrom)} ${year}`;
    case "year":
      return year;
    case "custom":
      return formatDateRangeLabel(range.dateFrom, range.dateTo);
  }
};

/** The period an address names, or null when it names none that can be read. */
export const periodFromParams = (
  params: URLSearchParams,
): ShownPeriod | null => {
  const month = params.get("month");
  if (month && MONTH_KEY.test(month)) return periodOf("month", `${month}-01`);

  const quarter = params.get("quarter")?.match(QUARTER_KEY);
  if (quarter) {
    const firstMonth = (Number(quarter[2]) - 1) * MONTHS_PER_QUARTER + 1;
    return periodOf(
      "quarter",
      `${quarter[1]}-${String(firstMonth).padStart(2, "0")}-01`,
    );
  }

  const year = params.get("year");
  if (year && YEAR_KEY.test(year)) return periodOf("year", `${year}-01-01`);

  const from = params.get("from");
  const to = params.get("to");
  if (
    from &&
    to &&
    isRealDate(from) &&
    isRealDate(to) &&
    from <= to &&
    to <= lastDayOfReportRange(from)
  ) {
    return { unit: "custom", range: { dateFrom: from, dateTo: to } };
  }

  return null;
};

/** The address parameters for a period; the current month needs none. */
export const periodToParams = (
  { unit, range }: ShownPeriod,
  today: string,
): Record<string, string> => {
  switch (unit) {
    case "month":
      return containsDate(range, today)
        ? {}
        : { month: toMonthKey(range.dateFrom) };
    case "quarter":
      return {
        quarter: `${range.dateFrom.slice(0, 4)}-Q${quarterOf(range.dateFrom)}`,
      };
    case "year":
      return { year: range.dateFrom.slice(0, 4) };
    case "custom":
      return { from: range.dateFrom, to: range.dateTo };
  }
};

/**
 * Whether Reports can show a period: it has started, and it reaches the
 * company's first month. Data before the company existed is simply empty.
 */
export const isShowablePeriod = (
  { range }: ShownPeriod,
  today: string,
  firstDay: string | undefined,
) => range.dateFrom <= today && (!firstDay || range.dateTo >= firstDay);
