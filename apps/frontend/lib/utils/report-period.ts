import {
  addMonthsToKey,
  formatDateRange,
  formatMonthLabel,
  formatShortMonthLabel,
  getMonthRange,
  lastDayOfReportRange,
  MAX_REPORT_RANGE_DAYS,
  toMonthKey,
} from "./date";

export type DateRange = { dateFrom: string; dateTo: string };

export type ReportPeriodUnit = "month" | "quarter" | "year";

/** A month, quarter or year stepped with the arrows, or any range picked on the calendar. */
export type ReportPeriod =
  | { unit: ReportPeriodUnit; firstMonth: string }
  | ({ unit: "custom" } & DateRange);

export type SteppedReportPeriod = Extract<
  ReportPeriod,
  { unit: ReportPeriodUnit }
>;

const MONTHS_IN: Record<ReportPeriodUnit, number> = {
  month: 1,
  quarter: 3,
  year: 12,
};

/** The month, quarter or year a YYYY-MM month falls in. */
export const periodHolding = (
  unit: ReportPeriodUnit,
  monthKey: string,
): SteppedReportPeriod => {
  const [year, month] = monthKey.split("-").map(Number);
  const monthIndex = month - 1;
  const firstMonthIndex = monthIndex - (monthIndex % MONTHS_IN[unit]);

  return {
    unit,
    firstMonth: `${year}-${String(firstMonthIndex + 1).padStart(2, "0")}`,
  };
};

const lastMonthOf = (period: SteppedReportPeriod) =>
  addMonthsToKey(period.firstMonth, MONTHS_IN[period.unit] - 1);

export const periodRange = (period: ReportPeriod): DateRange =>
  period.unit === "custom"
    ? { dateFrom: period.dateFrom, dateTo: period.dateTo }
    : {
        dateFrom: getMonthRange(period.firstMonth).dateFrom,
        dateTo: getMonthRange(lastMonthOf(period)).dateTo,
      };

export const stepPeriod = (
  period: SteppedReportPeriod,
  amount: number,
): SteppedReportPeriod => ({
  ...period,
  firstMonth: addMonthsToKey(
    period.firstMonth,
    amount * MONTHS_IN[period.unit],
  ),
});

/**
 * The period of another unit to switch to: the one holding the current month
 * when the period shown includes it, so a switch stays on today, and the one
 * holding the period's first month otherwise.
 */
export const switchUnit = (
  period: ReportPeriod,
  unit: ReportPeriodUnit,
  currentMonth: string,
): SteppedReportPeriod => {
  const { dateFrom, dateTo } = periodRange(period);
  const firstMonth = toMonthKey(dateFrom);
  const includesCurrentMonth =
    firstMonth <= currentMonth && currentMonth <= toMonthKey(dateTo);

  return periodHolding(unit, includesCurrentMonth ? currentMonth : firstMonth);
};

/** Whether the period before still has a month the company existed in. */
export const canStepBack = (
  period: SteppedReportPeriod,
  companyFirstMonth: string | undefined,
) =>
  !companyFirstMonth ||
  lastMonthOf(stepPeriod(period, -1)) >= companyFirstMonth;

const isYearToDate = (period: ReportPeriod, currentMonth: string) =>
  period.unit === "year" &&
  currentMonth.startsWith(period.firstMonth.slice(0, 4));

/** The period's name, and for a quarter or the current year a detail shown beside it. */
export const periodLabel = (
  period: ReportPeriod,
  currentMonth: string,
): { name: string; detail?: string } => {
  if (period.unit === "custom") {
    return { name: formatDateRange(period.dateFrom, period.dateTo) };
  }

  const year = period.firstMonth.slice(0, 4);

  if (period.unit === "month") {
    return { name: formatMonthLabel(period.firstMonth) };
  }

  if (period.unit === "quarter") {
    const monthIndex = Number(period.firstMonth.slice(5, 7)) - 1;
    const quarterNumber = monthIndex / MONTHS_IN.quarter + 1;
    return {
      name: `Q${quarterNumber} ${year}`,
      detail: `${formatShortMonthLabel(period.firstMonth)} – ${formatShortMonthLabel(lastMonthOf(period))}`,
    };
  }

  return {
    name: year,
    detail: isYearToDate(period, currentMonth) ? "to date" : undefined,
  };
};

/** Why a custom range can't be reported on; ranges of whole units always can. */
export const periodRangeError = (period: ReportPeriod) =>
  period.unit === "custom" &&
  period.dateTo > lastDayOfReportRange(period.dateFrom)
    ? `At most ${MAX_REPORT_RANGE_DAYS} days`
    : undefined;
