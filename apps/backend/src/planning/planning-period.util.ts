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

/** One project of a period plan and the hours it gets each day. */
export interface PeriodLine {
  projectId: string;
  minutesPerDay: number;
  /** Only the days that already have the project; otherwise every working day. */
  existingDaysOnly: boolean;
}

export interface PeriodWrites {
  created: { date: string; projectId: string; minutes: number }[];
  changed: { entry: PlanningEntry; minutes: number }[];
}

/** The plans a period plan creates and the ones whose hours it changes. */
export const periodWrites = ({
  plannedDays,
  lines,
  existing,
}: {
  plannedDays: Set<string>;
  lines: PeriodLine[];
  existing: PlanningEntry[];
}): PeriodWrites => {
  const existingByDayAndProject = new Map(
    existing.map((entry) => [`${entry.date}|${entry.projectId}`, entry]),
  );
  const writes: PeriodWrites = { created: [], changed: [] };

  for (const date of plannedDays) {
    for (const line of lines) {
      const entry = existingByDayAndProject.get(`${date}|${line.projectId}`);

      if (!entry) {
        if (!line.existingDaysOnly) {
          writes.created.push({
            date,
            projectId: line.projectId,
            minutes: line.minutesPerDay,
          });
        }
      } else if (entry.plannedMinutes !== line.minutesPerDay) {
        writes.changed.push({ entry, minutes: line.minutesPerDay });
      }
    }
  }

  return writes;
};

/**
 * Every day and week a period plan would take over its limit, on the plans as
 * they would be after it. As with a single plan, only a total the write
 * raises counts.
 */
export const periodProblems = ({
  weeks,
  plannedDays,
  lines,
  writes,
  existing,
  dayLimit,
}: {
  weeks: PeriodWeek[];
  plannedDays: Set<string>;
  lines: PeriodLine[];
  writes: PeriodWrites;
  /** The person's plans across every week the period touches. */
  existing: PlanningEntry[];
  dayLimit: number;
}): string[] => {
  const listed = new Set(lines.map((line) => line.projectId));
  const newMinutes = new Map(
    writes.changed.map(({ entry, minutes }) => [entry.id, minutes]),
  );
  const sum = (minutes: number[]) =>
    minutes.reduce((total, value) => total + value, 0);

  const totalsBetween = (from: string, to: string) => {
    const isInRange = (date: string) => date >= from && date <= to;
    const inRange = existing.filter((entry) => isInRange(entry.date));

    return {
      before: sum(inRange.map((entry) => entry.plannedMinutes)),
      after:
        sum(
          inRange.map(
            (entry) => newMinutes.get(entry.id) ?? entry.plannedMinutes,
          ),
        ) +
        sum(
          writes.created
            .filter((created) => isInRange(created.date))
            .map((created) => created.minutes),
        ),
      otherProjects: sum(
        inRange
          .filter((entry) => !listed.has(entry.projectId))
          .map((entry) => entry.plannedMinutes),
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
