import { TimeLog } from "@/types";

/** The labels and colour every view shows for an entry, derived in one place. */
type TimelogDisplay = {
  colorSeed: string;
  projectName: string;
  activityName: string;
};

export function getTimelogDisplay(timelog: TimeLog): TimelogDisplay {
  const project = timelog.projectActivity?.project;
  const activity = timelog.projectActivity?.activity;

  return {
    // Falling back to the entry id keeps the colour stable for this entry
    // instead of collapsing every unlabelled log onto one shade.
    colorSeed: project?.id ?? timelog.id,
    projectName: project?.name ?? "Unknown project",
    activityName: activity?.name ?? "Unknown activity",
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
