import { PlanningEntry } from './entities/planning-entry.entity';

export interface PeriodWeek {
  start: string;
  end: string;
  availableMinutes: number;
  /** The days in the week the person has hours on. */
  workingDays: string[];
}

/**
 * Plans are made in quarter hours, so a person's day, whole half-hours since
 * Phase 41 (decision 6), can always be filled exactly.
 */
export const PLAN_MINUTES_STEP = 15;

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
/**
 * A day over the person's own day, or a week over what they have available,
 * as a period plan would leave it. The screen sums them up; a refusal words
 * each one (`describePeriodProblem`).
 */
export interface PeriodProblem {
  kind: 'day' | 'week';
  /** The day, or the week's first day. */
  date: string;
  plannedMinutes: number;
  /** The person's day, or what they have available in the week. */
  limitMinutes: number;
  /** Planned on projects the period doesn't list. */
  otherProjectsMinutes: number;
}

export const periodProblems = ({
  weeks,
  plannedDays,
  lines,
  writes,
  existing,
  dayLimitOn,
}: {
  weeks: PeriodWeek[];
  plannedDays: Set<string>;
  lines: PeriodLine[];
  writes: PeriodWrites;
  /** The person's plans across every week the period touches. */
  existing: PlanningEntry[];
  /** The most the person can be planned on a date. */
  dayLimitOn: (date: string) => number;
}): PeriodProblem[] => {
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
  const problems: PeriodProblem[] = [];

  for (const week of weeks) {
    for (const date of week.workingDays.filter((d) => plannedDays.has(d))) {
      const day = totalsBetween(date, date);
      const limitMinutes = dayLimitOn(date);
      if (day.after > limitMinutes && day.after > day.before) {
        problems.push({
          kind: 'day',
          date,
          plannedMinutes: day.after,
          limitMinutes,
          otherProjectsMinutes: day.otherProjects,
        });
      }
    }

    const total = totalsBetween(week.start, week.end);
    if (total.after > week.availableMinutes && total.after > total.before) {
      problems.push({
        kind: 'week',
        date: week.start,
        plannedMinutes: total.after,
        limitMinutes: week.availableMinutes,
        otherProjectsMinutes: total.otherProjects,
      });
    }
  }

  return problems;
};

/** A problem in words, for a refusal: "Mon 2 Nov: 8h planned, over the 6h working day". */
export const describePeriodProblem = (problem: PeriodProblem): string => {
  const onOtherProjects =
    problem.otherProjectsMinutes > 0
      ? ` (${formatMinutes(problem.otherProjectsMinutes)} already planned on other projects)`
      : '';

  return problem.kind === 'day'
    ? `${formatDay(problem.date)}: ${formatMinutes(problem.plannedMinutes)} planned, over the ${formatMinutes(problem.limitMinutes)} working day${onOtherProjects}`
    : `Week of ${formatDay(problem.date, false)}: ${formatMinutes(problem.plannedMinutes)} planned of ${formatMinutes(problem.limitMinutes)} available${onOtherProjects}`;
};
