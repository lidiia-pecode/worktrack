import { PlanningEntry } from "@/types";
import { ProjectStatus } from "@/types/enums";
import {
  formatDayMonthLabel,
  formatDuration,
  formatWeekdayLabel,
  fromISODate,
} from "@/lib/utils/date";

/** Beyond this many days, a row sums its days up instead of naming each. */
const MAX_NAMED_DAYS = 4;

export interface PlannedDay {
  date: string;
  minutes: number;
}

/** A project already planned in the period, as its row in the form shows it. */
export interface ListedLine {
  projectId: string;
  name: string;
  isArchived: boolean;
  /** Its days in the period, in order. */
  days: PlannedDay[];
  /** The hours when every day has the same; null when they differ. */
  sameMinutes: number | null;
  /** The hours most of its days have, where "Set hours" starts. */
  commonMinutes: number;
}

const mostCommon = (values: number[]): number => {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
};

/** One row per project the person's plans in the period are on, by name. */
export const listedLines = (plans: PlanningEntry[]): ListedLine[] => {
  const byProject = new Map<string, PlanningEntry[]>();
  plans.forEach((plan) =>
    byProject.set(plan.project.id, [
      ...(byProject.get(plan.project.id) ?? []),
      plan,
    ]),
  );

  return [...byProject.values()]
    .map((projectPlans) => {
      const { project } = projectPlans[0];
      const days = projectPlans
        .map((plan) => ({ date: plan.date, minutes: plan.plannedMinutes }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const minutes = days.map((day) => day.minutes);

      return {
        projectId: project.id,
        name: project.name,
        isArchived: project.status === ProjectStatus.ARCHIVED,
        days,
        sameMinutes: minutes.every((value) => value === minutes[0])
          ? minutes[0]
          : null,
        commonMinutes: mostCommon(minutes),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

const dayLabel = (date: string) =>
  `${formatWeekdayLabel(fromISODate(date))} ${formatDayMonthLabel(date)}`;

const daysCount = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

const hoursRange = (days: PlannedDay[]) => {
  const minutes = days.map((day) => day.minutes);
  return `${formatDuration(Math.min(...minutes))} to ${formatDuration(Math.max(...minutes))}`;
};

const isNamed = (days: PlannedDay[]) => days.length <= MAX_NAMED_DAYS;

const dayLabels = (days: PlannedDay[]) =>
  days.map((day) => dayLabel(day.date)).join(", ");

/**
 * Hours that differ by day, without naming the days: "hours vary, mostly 2h",
 * or the range when no value repeats.
 */
const varyingHours = (line: ListedLine) => {
  const isRepeated =
    line.days.filter((day) => day.minutes === line.commonMinutes).length > 1;

  return isRepeated
    ? `hours vary, mostly ${formatDuration(line.commonMinutes)}`
    : `hours vary, ${hoursRange(line.days)}`;
};

/**
 * The row's days a save changes: a listed project changes only on working
 * days (`periodWrites`), so a plan left on a day with no hours keeps its own.
 * Every day until the preview has named the working days.
 */
const savedDays = (line: ListedLine, workingDays: string[]) =>
  workingDays.length === 0
    ? line.days
    : line.days.filter((day) => workingDays.includes(day.date));

/**
 * Which days a row is on: "Every working day · 19 days", the days themselves
 * when there are a few, or how many and between which. Hours that differ by
 * day are summed up rather than listed: "21 days · hours vary, mostly 2h".
 */
export const describeDays = (
  line: ListedLine,
  workingDays: string[],
): string => {
  const dates = line.days.map((day) => day.date);
  const count = daysCount(dates.length);

  if (line.sameMinutes === null) {
    return `${count} · ${varyingHours(line)}`;
  }

  if (
    workingDays.length > 1 &&
    workingDays.every((day) => dates.includes(day))
  ) {
    return `Every working day · ${count}`;
  }

  return isNamed(line.days)
    ? `${dayLabels(line.days)} · ${count}`
    : `${count}, ${formatDayMonthLabel(dates[0])} – ${formatDayMonthLabel(dates[dates.length - 1])}`;
};

/** What a row in "Set hours" says it changes: "Same hours on all 21 days". */
export const setHoursDetail = (
  line: ListedLine,
  workingDays: string[],
): string =>
  `Same hours on all ${daysCount(savedDays(line, workingDays).length)}`;

/** The preview's line for a listed row whose hours change on `changedDays`. */
export const listedChangeText = (
  line: ListedLine,
  minutes: number,
  changedDays: number,
  workingDays: string[],
): string => {
  if (line.sameMinutes !== null) {
    return `change ${line.name} from ${formatDuration(line.sameMinutes)} to ${formatDuration(minutes)} on ${daysCount(changedDays)}`;
  }

  return `set ${line.name} to ${formatDuration(minutes)} on all ${daysCount(savedDays(line, workingDays).length)}`;
};

/** The preview's line for a project added to every working day. */
export const addedText = (
  name: string,
  minutes: number,
  addedDays: number,
): string =>
  `add ${name}, ${formatDuration(minutes)} on ${addedDays} working ${addedDays === 1 ? "day" : "days"}`;

export interface DayShare {
  projectId: string;
  minutes: number;
}

/**
 * The fullest working day saving would leave, and each project's share of
 * it, from the plans in the period with the edited and added hours applied.
 */
export const busiestDay = ({
  plannedDays,
  plans,
  editedMinutes,
  added,
}: {
  plannedDays: string[];
  plans: PlanningEntry[];
  /** New hours for listed projects, on the days they already have. */
  editedMinutes: Map<string, number>;
  /** Projects added to every working day. */
  added: DayShare[];
}): { minutes: number; shares: DayShare[]; isSameEveryDay: boolean } => {
  const days = plannedDays.map((date) => {
    const shares: DayShare[] = [
      ...plans
        .filter((plan) => plan.date === date)
        .map((plan) => ({
          projectId: plan.project.id,
          minutes: editedMinutes.get(plan.project.id) ?? plan.plannedMinutes,
        })),
      ...added,
    ];
    return {
      shares,
      minutes: shares.reduce((total, share) => total + share.minutes, 0),
    };
  });
  const busiest = days.reduce<(typeof days)[number] | undefined>(
    (fullest, day) =>
      !fullest || day.minutes > fullest.minutes ? day : fullest,
    undefined,
  );

  return {
    minutes: busiest?.minutes ?? 0,
    shares: busiest?.shares ?? [],
    isSameEveryDay: days.every((day) => day.minutes === busiest?.minutes),
  };
};
