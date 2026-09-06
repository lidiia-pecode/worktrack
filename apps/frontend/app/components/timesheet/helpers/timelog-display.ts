import { TimeLog } from "@/types";

/**
 * `TimeLog.projectActivity` is not guaranteed on every response, so the grid
 * derives its labels here rather than reaching through the relation in each
 * component. One place to update once the API always sends it.
 */
export type TimelogDisplay = {
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
