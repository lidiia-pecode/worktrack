import { Absence } from "@/types";
import { AbsenceType } from "@/types/enums";

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  [AbsenceType.VACATION]: "Vacation",
  [AbsenceType.SICK_LEAVE]: "Sick leave",
  [AbsenceType.PUBLIC_HOLIDAY]: "Public holiday",
};

/** Short enough for a day cell in the team grid. */
export const ABSENCE_TYPE_SHORT_LABELS: Record<AbsenceType, string> = {
  [AbsenceType.VACATION]: "Vacation",
  [AbsenceType.SICK_LEAVE]: "Sick",
  [AbsenceType.PUBLIC_HOLIDAY]: "Holiday",
};

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
