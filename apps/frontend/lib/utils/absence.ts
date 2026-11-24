import { Absence } from "@/types";
import { AbsenceType } from "@/types/enums";

import {
  addDays,
  formatDayRangeLabel,
  formatDuration,
  isWeekend,
  toISODate,
} from "./date";

/** "Support Desk 8h, CRM 2h": the plans an absence removes, by project. */
export const projectHoursText = (
  projects: { name: string; minutes: number }[],
) =>
  projects
    .map(({ name, minutes }) => `${name} ${formatDuration(minutes)}`)
    .join(", ");

/** The longest one absence may last, both days counted; the API refuses more. */
export const MAX_ABSENCE_DAYS = 366;

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  [AbsenceType.VACATION]: "Vacation",
  [AbsenceType.SICK_LEAVE]: "Sick leave",
  [AbsenceType.PUBLIC_HOLIDAY]: "Public holiday",
};

export const ABSENCE_TYPE_SHORT_LABELS: Record<AbsenceType, string> = {
  [AbsenceType.VACATION]: "Vacation",
  [AbsenceType.SICK_LEAVE]: "Sick",
  [AbsenceType.PUBLIC_HOLIDAY]: "Holiday",
};

/** Part of one day, with its minutes, rather than a whole day or days. */
export const isPartDayAbsence = (
  absence: Pick<Absence, "minutes">,
): absence is { minutes: number } => typeof absence.minutes === "number";

/** "vacation", or "vacation 2h 25m" for part of a day, after a day's name. */
export const absenceDayText = (absence: Absence) => {
  const reason = ABSENCE_TYPE_LABELS[absence.type].toLowerCase();
  return isPartDayAbsence(absence)
    ? `${reason} ${formatDuration(absence.minutes)}`
    : reason;
};

/** Its days, and the hours of part of a day: "Nov 23, 2h 25m". */
export function formatAbsenceRange(absence: Absence): string {
  const days = formatDayRangeLabel(absence.startDate, absence.endDate);
  return isPartDayAbsence(absence)
    ? `${days}, ${formatDuration(absence.minutes)}`
    : days;
}

/**
 * An absence is stored as a range, so the day-by-day views expand it into the
 * days it covers. Days outside the range asked for are left out.
 */
export function mapAbsencesByDate(
  absences: Absence[],
  dates: string[],
): Record<string, Absence> {
  const byDate: Record<string, Absence> = {};

  dates.forEach((date) => {
    const covering = absences.find(
      (absence) => absence.startDate <= date && absence.endDate >= date,
    );

    if (covering) byDate[date] = covering;
  });

  return byDate;
}

/** The same expansion for a view showing several people at once. */
export function mapAbsencesByUserAndDate(
  absences: Absence[],
  dates: string[],
): Record<string, Record<string, Absence>> {
  const byUser: Record<string, Absence[]> = {};

  absences.forEach((absence) => {
    (byUser[absence.userId] ??= []).push(absence);
  });

  return Object.fromEntries(
    Object.entries(byUser).map(([userId, theirs]) => [
      userId,
      mapAbsencesByDate(theirs, dates),
    ]),
  );
}

const nextWorkingDay = (date: Date): Date => {
  let day = date;
  while (isWeekend(day)) day = addDays(day, 1);
  return day;
};

/**
 * The first day "Add absence" offers: today in the current week, otherwise the
 * shown week's first day, moved past a weekend. A locked day falls back to
 * today, since nothing can be recorded on it.
 */
export function newAbsenceStartDate({
  today,
  weekStart,
  isCurrentWeek,
  isEditable,
}: {
  today: Date;
  weekStart: Date;
  isCurrentWeek: boolean;
  isEditable: (date: string) => boolean;
}): string {
  const preferred = toISODate(
    nextWorkingDay(isCurrentWeek ? today : weekStart),
  );

  return isEditable(preferred) ? preferred : toISODate(nextWorkingDay(today));
}
