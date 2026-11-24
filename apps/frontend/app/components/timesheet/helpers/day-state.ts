import { Absence, PlanningEntry, TimeLog } from "@/types";
import { isWeekend } from "@/lib/utils/date";
import { isWholeDayAbsence } from "@/lib/utils/absence";

/** One day of the person's week, as both the grid and the list draw it. */
export interface TimesheetDay {
  date: Date;
  timelogs: TimeLog[];
  plannedEntries: PlanningEntry[];
  absence?: Absence;
  isAbsenceLocked: boolean;
  totalMinutes: number;
  /** The person's own expected minutes that day; undefined until it loads. */
  expectedMinutes?: number;
  isLocked: boolean;
  isEditable: boolean;
  /** False for a day that hasn't happened: its entries and absence still open. */
  canLogTime: boolean;
}

/** What a day offers, the same in the grid and the list. */
export const dayActions = ({
  date,
  absence,
  isAbsenceLocked,
  isEditable,
  canLogTime,
  timelogs,
  plannedEntries,
}: Pick<
  TimesheetDay,
  | "date"
  | "absence"
  | "isAbsenceLocked"
  | "isEditable"
  | "canLogTime"
  | "timelogs"
  | "plannedEntries"
>) => {
  // Part of a day away leaves a working day, which takes time and plans.
  const isWholeDayOff = isWholeDayAbsence(absence);

  return {
    // A day an absence covers opens the absence, its locked days too, so its
    // open days can still change.
    opensAbsence: !!absence && (isEditable || isAbsenceLocked),
    canAddEntry: !isWholeDayOff && isEditable && canLogTime,
    // A working day still to come takes no time, but can be taken off.
    canAddAbsence: !absence && isEditable && !canLogTime && !isWeekend(date),
    // Once any time is logged, the record replaces the plan.
    showsPlan:
      !isWholeDayOff && timelogs.length === 0 && plannedEntries.length > 0,
  };
};
