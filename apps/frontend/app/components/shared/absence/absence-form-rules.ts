import { MAX_ABSENCE_DAYS } from "@/lib/utils/absence";
import {
  firstOfMonth,
  formatDayRangeLabel,
  formatDuration,
  fromISODate,
  isWeekend,
  shiftISODate,
  toISODate,
} from "@/lib/utils/date";
import { AbsenceLockedPart } from "@/lib/utils/reporting-period";

type IsUnavailable = (date: string) => boolean;

/** First and last day, both counted. */
export type DaySpan = { from: string; to: string };

export const UNAVAILABLE_DAYS_HINT =
  "Days with time logged, another absence or in a locked month can't be chosen.";

/** Under the date fields, for a chosen range that holds a day it can't take. */
export const unavailableDayError = (day: string) =>
  `${formatDayRangeLabel(day, day)} can't be part of this absence: it has time logged, another absence or is in a locked month.`;

/** Why the hours of part of a day can't be saved, as the server checks them. */
export const partDayError = ({
  minutes,
  workingMinutes,
  loggedMinutes,
  isMeasuredAgainstLogged,
}: {
  minutes: number;
  workingMinutes: number;
  loggedMinutes: number;
  isMeasuredAgainstLogged: boolean;
}) => {
  const left = Math.max(0, workingMinutes - loggedMinutes);
  if (workingMinutes === 0) return "This day has no working hours.";
  if (minutes === 0) return "Enter the hours away";
  if (minutes >= workingMinutes) {
    return `Part of a day is shorter than the ${formatDuration(workingMinutes)} working day. Choose Whole day instead.`;
  }
  if (isMeasuredAgainstLogged && minutes > left) {
    return `Only ${formatDuration(left)} of this day is left: ${formatDuration(loggedMinutes)} is already logged.`;
  }
  return undefined;
};

/**
 * The days the form reads to know which can't be taken: the month a picker
 * shows with the grid's days around it, widened to the chosen days.
 */
export const unavailableDaysWindow = (
  shownMonth: string,
  startDate: string,
  endDate: string,
): DaySpan => ({
  from: [shiftISODate(shownMonth, -7), startDate].sort()[0],
  to: [
    shiftISODate(toISODate(firstOfMonth(fromISODate(shownMonth), 1)), 14),
    toISODate(firstOfMonth(fromISODate(endDate), 1)),
  ].sort()[1],
});

/** The first working day from `from` to `until` an absence can take. */
export const firstFreeWorkingDay = (
  from: string,
  until: string,
  isUnavailable: IsUnavailable,
) => {
  for (let day = from; day <= until; day = shiftISODate(day, 1)) {
    if (!isWeekend(fromISODate(day)) && !isUnavailable(day)) return day;
  }
  return undefined;
};

/** The first unavailable day in the spans, in their order, if there is one. */
export const firstUnavailableIn = (
  spans: DaySpan[],
  isUnavailable: IsUnavailable,
) => {
  for (const { from, to } of spans) {
    for (let day = from; day <= to; day = shiftISODate(day, 1)) {
      if (isUnavailable(day)) return day;
    }
  }
  return undefined;
};

/** The first unavailable day after `from`, up to `until`, if there is one. */
export const firstUnavailableAfter = (
  from: string,
  until: string,
  isUnavailable: IsUnavailable,
) =>
  firstUnavailableIn(
    [{ from: shiftISODate(from, 1), to: until }],
    isUnavailable,
  );

/**
 * The latest last day an absence from `startDate` can have: the day before
 * the first one it can't take, or the longest an absence lasts.
 */
export const latestLastDayFrom = (
  startDate: string,
  isUnavailable: IsUnavailable,
) => {
  const limit = shiftISODate(startDate, MAX_ABSENCE_DAYS - 1);
  const blocked = firstUnavailableAfter(startDate, limit, isUnavailable);
  return blocked ? shiftISODate(blocked, -1) : limit;
};

/**
 * The chosen days that can still change, which are the ones checked: all of
 * them, or those outside the days a locked month keeps.
 */
export const changeableDays = (
  startDate: string,
  endDate: string,
  lockedPart?: AbsenceLockedPart | null,
): DaySpan[] =>
  lockedPart
    ? [
        { from: startDate, to: shiftISODate(lockedPart.from, -1) },
        { from: shiftISODate(lockedPart.to, 1), to: endDate },
      ]
    : [{ from: startDate, to: endDate }];
