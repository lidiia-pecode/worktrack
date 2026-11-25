import { Absence, ClosedSpell, PlanningEntry, PlanningProject } from "@/types";
import {
  ABSENCE_TYPE_SHORT_LABELS,
  isPartDayAbsence,
} from "@/lib/utils/absence";
import { formatDuration } from "@/lib/utils/date";
import { CLOSED_DAY_TEXT } from "@/lib/utils/user";

type PlanBar = {
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

/** What a day of a row holds, for its tooltip and a screen reader. */
export const describePlanDay = ({
  entries,
  absence,
  closed,
}: {
  entries: PlanningEntry[];
  absence?: Absence;
  /** Why the row doesn't hold the day, when it doesn't. */
  closed?: ClosedSpell["reason"];
}) => {
  if (closed) return CLOSED_DAY_TEXT[closed];

  const plans = entries.map(
    (entry) => `${entry.project.name} ${formatDuration(entry.plannedMinutes)}`,
  );
  const away =
    absence &&
    (isPartDayAbsence(absence)
      ? `${ABSENCE_TYPE_SHORT_LABELS[absence.type]} ${formatDuration(absence.minutes)}`
      : ABSENCE_TYPE_SHORT_LABELS[absence.type]);
  const parts = [away, ...plans];
  return parts.filter(Boolean).join(", ") || "nothing planned";
};
