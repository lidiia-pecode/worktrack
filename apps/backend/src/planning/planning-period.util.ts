import { PlanningEntry } from './entities/planning-entry.entity';

export interface PeriodWeek {
  start: string;
  end: string;
  availableMinutes: number;
  /** The days in the week the person has hours on. */
  workingDays: string[];
}

export const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

/** "Thu 20 Nov", or "20 Nov" without the weekday. */
export const formatDay = (date: string, withWeekday = true): string =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: withWeekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/**
 * Every day and week a period plan would take over its limit. As with a
 * single plan, only a total the write raises counts.
 */
export const periodProblems = ({
  weeks,
  plannedDays,
  minutesByProject,
  existing,
  dayLimit,
}: {
  weeks: PeriodWeek[];
  plannedDays: Set<string>;
  /** The listed projects and the minutes each gets per day. */
  minutesByProject: Map<string, number>;
  /** The person's plans across every week the period touches. */
  existing: PlanningEntry[];
  dayLimit: number;
}): string[] => {
  const listedPerDay = [...minutesByProject.values()].reduce(
    (sum, minutes) => sum + minutes,
    0,
  );
  const sum = (entries: PlanningEntry[]) =>
    entries.reduce((total, e) => total + e.plannedMinutes, 0);

  const totalsBetween = (from: string, to: string) => {
    const inRange = existing.filter((e) => e.date >= from && e.date <= to);
    const kept = inRange.filter(
      (e) => !(plannedDays.has(e.date) && minutesByProject.has(e.projectId)),
    );
    const newDays = [...plannedDays].filter((d) => d >= from && d <= to);

    return {
      before: sum(inRange),
      after: sum(kept) + newDays.length * listedPerDay,
      otherProjects: sum(
        kept.filter((e) => !minutesByProject.has(e.projectId)),
      ),
    };
  };
  const onOtherProjects = (minutes: number): string =>
    minutes > 0
      ? ` (${formatMinutes(minutes)} already planned on other projects)`
      : '';

  const problems: string[] = [];

  for (const week of weeks) {
    for (const date of week.workingDays.filter((d) => plannedDays.has(d))) {
      const day = totalsBetween(date, date);
      if (day.after > dayLimit && day.after > day.before) {
        problems.push(
          `${formatDay(date)}: ${formatMinutes(day.after)} planned, over the ${formatMinutes(dayLimit)} working day${onOtherProjects(day.otherProjects)}`,
        );
      }
    }

    const total = totalsBetween(week.start, week.end);
    if (total.after > week.availableMinutes && total.after > total.before) {
      problems.push(
        `Week of ${formatDay(week.start, false)}: ${formatMinutes(total.after)} planned of ${formatMinutes(week.availableMinutes)} available${onOtherProjects(total.otherProjects)}`,
      );
    }
  }

  return problems;
};
