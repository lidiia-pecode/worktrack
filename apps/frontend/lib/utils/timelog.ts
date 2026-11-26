import { TimeLog } from "@/types";

/** The labels and colour every view shows for an entry, derived in one place. */
type TimelogDisplay = {
  colorSeed: string;
  projectName: string;
  activityName: string;
};

export function getTimelogDisplay(timelog: TimeLog): TimelogDisplay {
  const { project, activity } = timelog.projectActivity;

  return {
    colorSeed: project.id,
    projectName: project.name,
    activityName: activity.name,
  };
}

/** Each day's entries in the order they were logged; the API lists the newest first. */
export function groupTimelogsByDate(
  timelogs: TimeLog[],
): Record<string, TimeLog[]> {
  const byDate: Record<string, TimeLog[]> = {};

  [...timelogs]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((log) => {
      (byDate[log.date] ??= []).push(log);
    });

  return byDate;
}
