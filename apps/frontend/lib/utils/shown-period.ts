import { ReportRange } from "@/types";

import {
  addDays,
  addMonthsToKey,
  formatDateRangeLabel,
  formatMonthLabel,
  fromISODate,
  getMonthRange,
  isISODate,
  isMonthKey,
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

const yearOf = (date: string) => date.slice(0, 4);

/** 1 for January. */
const monthNumberOf = (date: string) => Number(date.slice(5, 7));

/** A year's month as YYYY-MM, 1 for January. */
const monthKeyOf = (year: string, monthNumber: number) =>
  `${year}-${String(monthNumber).padStart(2, "0")}`;

const quarterOf = (date: string) =>
  Math.floor((monthNumberOf(date) - 1) / MONTHS_PER_QUARTER) + 1;

/** The calendar month, quarter or year a date falls in. */
export const periodOf = (unit: CalendarUnit, date: string): ShownPeriod => {
  const months = MONTHS_PER_UNIT[unit];
  const firstMonthNumber =
    Math.floor((monthNumberOf(date) - 1) / months) * months + 1;
  const firstMonth = monthKeyOf(yearOf(date), firstMonthNumber);
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

  return periodOf(
    unit,
    isLarger ? period.range.dateFrom : lastShownDay(period.range, today),
  );
};

/** The range's last day, or today while it runs. */
export const lastShownDay = ({ dateTo }: ReportRange, today: string) =>
  dateTo < today ? dateTo : today;

export const containsDate = ({ dateFrom, dateTo }: ReportRange, date: string) =>
  dateFrom <= date && date <= dateTo;

/** "October 2026", "Q3 2026", "2026", or a custom range's dates. */
export const periodLabel = ({ unit, range }: ShownPeriod) => {
  const year = yearOf(range.dateFrom);

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
  if (month && isMonthKey(month)) {
    return periodOf("month", getMonthRange(month).dateFrom);
  }

  const quarter = params.get("quarter")?.match(QUARTER_KEY);
  if (quarter) {
    const [, year, quarterNumber] = quarter;
    const firstMonth = monthKeyOf(
      year,
      (Number(quarterNumber) - 1) * MONTHS_PER_QUARTER + 1,
    );
    return periodOf("quarter", getMonthRange(firstMonth).dateFrom);
  }

  const year = params.get("year");
  if (year && YEAR_KEY.test(year)) {
    return periodOf("year", `${year}-01-01`);
  }

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
        quarter: `${yearOf(range.dateFrom)}-Q${quarterOf(range.dateFrom)}`,
      };
    case "year":
      return { year: yearOf(range.dateFrom) };
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
