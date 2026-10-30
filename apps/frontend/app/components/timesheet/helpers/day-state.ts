import { Absence, PlanningEntry, TimeLog } from "@/types";

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
  absence,
  isAbsenceLocked,
  isEditable,
  canLogTime,
  timelogs,
  plannedEntries,
}: Pick<
  TimesheetDay,
  | "absence"
  | "isAbsenceLocked"
  | "isEditable"
  | "canLogTime"
  | "timelogs"
  | "plannedEntries"
>) => ({
  // A day an absence covers opens the absence instead of a new entry, to read
  // once it is locked.
  opensAbsence: !!absence && (isEditable || isAbsenceLocked),
  canAddEntry: !absence && isEditable && canLogTime,
  // Once any time is logged, the record replaces the plan.
  showsPlan: !absence && timelogs.length === 0 && plannedEntries.length > 0,
});
