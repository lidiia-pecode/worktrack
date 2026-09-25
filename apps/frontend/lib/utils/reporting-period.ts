import { Absence, ReportingMonth } from "@/types";
import { ReportingMonthState } from "@/types/enums";

import { addMonthsToKey, getMonthRange, toMonthKey } from "./date";

/** The most months `GET /periods` returns in one request. */
export const MAX_PERIOD_MONTHS_PER_REQUEST = 36;

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
 * shows. Only past months can lock, so absences never widen it past today, and
 * it stays within what one request may cover.
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

  const earliestAllowedMonth = addMonthsToKey(
    toMonthKey(latestPastAbsenceEnd),
    -(MAX_PERIOD_MONTHS_PER_REQUEST - 1),
  );
  const earliestAllowedDate = getMonthRange(earliestAllowedMonth).dateFrom;

  return {
    dateFrom:
      earliestAbsenceStart < earliestAllowedDate
        ? earliestAllowedDate
        : earliestAbsenceStart,
    dateTo: latestPastAbsenceEnd,
  };
}
