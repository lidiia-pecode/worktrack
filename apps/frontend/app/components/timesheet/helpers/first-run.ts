/** What a week of the timesheet can show for someone who may have nothing to log. */
export type TimesheetContent = "week" | "notOnProjects" | "noActivities";

interface TimesheetCounts {
  loggableActivities: number;
  ownProjects: number;
  timeLogs: number;
  absences: number;
}

export const timesheetContentFor = ({
  loggableActivities,
  ownProjects,
  timeLogs,
  absences,
}: TimesheetCounts): TimesheetContent => {
  if (loggableActivities > 0 || timeLogs > 0 || absences > 0) return "week";

  return ownProjects > 0 ? "noActivities" : "notOnProjects";
};

export const showsWeekFigures = ({
  loggableActivities,
  timeLogs,
}: Pick<TimesheetCounts, "loggableActivities" | "timeLogs">): boolean =>
  loggableActivities > 0 || timeLogs > 0;
