import { PlanningEntry, PlanningProject } from "@/types";

export type PlanBar = {
  project: PlanningProject;
  /** The index of its first day among the dates given. */
  start: number;
  /** How many of those days it covers. */
  length: number;
  /** Planned a day, the same on each of its days. */
  minutes: number;
  /** One per project, in name order, so a project keeps its row. */
  lane: number;
};

/**
 * A row's plans over the given days as bars: one per run of days next to
 * each other with the same project and hours. A day without the project or
 * with other hours ends the bar.
 */
export const planBars = (
  entries: PlanningEntry[],
  dates: string[],
): PlanBar[] => {
  const projects = [
    ...new Map(entries.map((entry) => [entry.project.id, entry.project])),
  ]
    .map(([, project]) => project)
    .sort((a, b) => a.name.localeCompare(b.name));

  const bars: PlanBar[] = [];
  projects.forEach((project, lane) => {
    let open: PlanBar | null = null;

    dates.forEach((date, index) => {
      const entry = entries.find(
        (candidate) =>
          candidate.project.id === project.id && candidate.date === date,
      );
      if (
        entry &&
        open &&
        open.minutes === entry.plannedMinutes &&
        open.start + open.length === index
      ) {
        open.length += 1;
        return;
      }
      if (open) bars.push(open);
      open = entry
        ? {
            project,
            start: index,
            length: 1,
            minutes: entry.plannedMinutes,
            lane,
          }
        : null;
    });
    if (open) bars.push(open);
  });

  return bars;
};
