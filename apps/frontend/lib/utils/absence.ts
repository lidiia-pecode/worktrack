import { Absence } from "@/types";
import { AbsenceType } from "@/types/enums";

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  [AbsenceType.VACATION]: "Vacation",
  [AbsenceType.SICK_LEAVE]: "Sick leave",
  [AbsenceType.PUBLIC_HOLIDAY]: "Public holiday",
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
