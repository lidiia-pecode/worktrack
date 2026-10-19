import { Absence, ReportingMonth, ReportingPeriodsQuery } from "@/types";
import { ReportingMonthState } from "@/types/enums";

import { addMonthsToKey, getMonthRange, toMonthKey } from "./date";

/** The most months `GET /periods` returns in one request. */
export const MAX_PERIOD_MONTHS_PER_REQUEST = 36;

/** How many days a month stays editable after it ends; mirrors the backend's `GRACE_DAYS`. */
export const GRACE_DAYS = 7;

/** How many months the Periods page lists at a time. */
export const PERIOD_MONTHS_PER_PAGE = 12;

const notBefore = (monthKey: string, firstMonth: string) =>
  monthKey < firstMonth ? firstMonth : monthKey;

/** The Periods list's first page: the current month back, but never before the company's first month. */
export function firstPeriodsPage(
  currentMonth: string,
  firstMonth: string,
): ReportingPeriodsQuery {
  const from = addMonthsToKey(currentMonth, -(PERIOD_MONTHS_PER_PAGE - 1));

  return { from: notBefore(from, firstMonth), to: currentMonth };
}

/** The page before the oldest month shown, or null once the company's first month is on screen. */
export function olderPeriodsPage(
  oldestShownMonth: string,
  firstMonth: string,
): ReportingPeriodsQuery | null {
  if (oldestShownMonth <= firstMonth) return null;

  const to = addMonthsToKey(oldestShownMonth, -1);
  const from = addMonthsToKey(to, -(PERIOD_MONTHS_PER_PAGE - 1));

  return { from: notBefore(from, firstMonth), to };
}

/** Whether a YYYY-MM-DD date falls in one of the months the server reports as locked. */
export function lockedDateLookup(months: ReportingMonth[]) {
  const lockedMonthKeys = new Set(
    months
      .filter((period) => period.state === ReportingMonthState.LOCKED)
      .map((period) => period.month),
  );

  return (date: string) => lockedMonthKeys.has(toMonthKey(date));
}

/** Whether any day from `startDate` to `endDate` falls in a locked month. */
export function isRangeLocked(
  isLocked: (date: string) => boolean,
  startDate: string,
  endDate: string,
) {
  const lastMonth = toMonthKey(endDate);

  for (
    let month = toMonthKey(startDate);
    month <= lastMonth;
    month = addMonthsToKey(month, 1)
  ) {
    if (isLocked(getMonthRange(month).dateFrom)) return true;
  }

  return false;
}

/**
 * The dates to ask lock states for: a week, widened to cover the absences it
 * shows. Only past months can lock, so absences never widen it past today. One
 * request may cover only so many months, so what the absences add is trimmed
 * first and the week itself always stays covered.
 */
export function lockLookupRange(
  weekStart: string,
  weekEnd: string,
  absences: Absence[],
  today: string,
): { dateFrom: string; dateTo: string } {
  const earliestAbsenceStart = absences
    .map((absence) => absence.startDate)
    .reduce((earliest, date) => (date < earliest ? date : earliest), weekStart);

  const latestPastAbsenceEnd = absences
    .map((absence) => (absence.endDate < today ? absence.endDate : today))
    .reduce((latest, date) => (date > latest ? date : latest), weekEnd);

  const monthsAfterFirst = MAX_PERIOD_MONTHS_PER_REQUEST - 1;

  const earliestAllowedDate = getMonthRange(
    addMonthsToKey(toMonthKey(weekEnd), -monthsAfterFirst),
  ).dateFrom;
  const dateFrom =
    earliestAbsenceStart < earliestAllowedDate
      ? earliestAllowedDate
      : earliestAbsenceStart;

  const latestAllowedDate = getMonthRange(
    addMonthsToKey(toMonthKey(dateFrom), monthsAfterFirst),
  ).dateTo;
  const dateTo =
    latestPastAbsenceEnd > latestAllowedDate
      ? latestAllowedDate
      : latestPastAbsenceEnd;

  return { dateFrom, dateTo };
}
