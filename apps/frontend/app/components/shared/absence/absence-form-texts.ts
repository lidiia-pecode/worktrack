import { Absence, AbsenceDay } from "@/types";
import {
  ABSENCE_TYPE_LABELS,
  formatAbsenceRange,
  isPartDayAbsence,
} from "@/lib/utils/absence";
import {
  formatDayRangeLabel,
  formatDuration,
  shiftISODate,
} from "@/lib/utils/date";
import { AbsenceLockedPart } from "@/lib/utils/reporting-period";

export const PLANS_CHECK_ERROR =
  "Plans on these days couldn't load, so the absence can't be saved yet.";

export const DAY_CHECK_ERROR =
  "This day's hours couldn't load, so part of it can't be saved yet.";

/** Under the locked days in the form: why its reason and note can't change. */
export const LOCKED_RECORD_NOTE = "Its reason and note stay as they are too.";

/** What a part of a day leaves for the plans already on it, which stay. */
export const plannedAgainstLeftText = (planned: number, leftAfter: number) =>
  planned > leftAfter
    ? `${formatDuration(planned)} planned on this day, ${formatDuration(leftAfter)} left after the absence. The plans stay, and Planning shows the week as over.`
    : `${formatDuration(planned)} planned on this day, ${formatDuration(leftAfter)} left after the absence.`;

/** Why a day that logged time fills takes no new absence. */
export const filledDayText = ({ workingMinutes, loggedMinutes }: AbsenceDay) =>
  workingMinutes === 0
    ? `${formatDuration(loggedMinutes)} is logged on this day, which has no working hours, so it can't be taken off.`
    : `${formatDuration(loggedMinutes)} is logged on this day, so none of it is left to take off. Remove some of that time first.`;

export const deletedAbsenceText = (absence: Absence) => {
  if (isPartDayAbsence(absence)) {
    return `${ABSENCE_TYPE_LABELS[absence.type]} on ${formatAbsenceRange(absence)} will be deleted, and that day's hours are expected again. This can't be undone.`;
  }
  const daysBecome =
    absence.startDate === absence.endDate
      ? "that day becomes a working day"
      : "those days become working days";

  return `${ABSENCE_TYPE_LABELS[absence.type]} on ${formatAbsenceRange(absence)} will be deleted, and ${daysBecome} again. This can't be undone.`;
};

export const lockedDaysText = ({ from, to }: AbsenceLockedPart) =>
  from === to
    ? `${formatDayRangeLabel(from, to)} stays as it is: it's in a locked month.`
    : `${formatDayRangeLabel(from, to)} stay as they are: they're in a locked month.`;

/** The open days a delete removes from an absence partly in a locked month. */
export const removedOpenDaysText = (
  absence: Absence,
  locked: AbsenceLockedPart,
) => {
  const removed = [
    locked.startOpen &&
      formatDayRangeLabel(absence.startDate, shiftISODate(locked.from, -1)),
    locked.endOpen &&
      formatDayRangeLabel(shiftISODate(locked.to, 1), absence.endDate),
  ].filter(Boolean);

  return `${removed.join(" and ")} will be removed from this absence. ${lockedDaysText(locked)} This can't be undone.`;
};
