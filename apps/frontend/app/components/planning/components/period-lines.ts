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

const WEEKDAY_NAME = new Intl.DateTimeFormat(undefined, { weekday: "long" });

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

const isNamed = (line: ListedLine) => line.days.length <= MAX_NAMED_DAYS;

/**
 * Which days a row is on: "Every working day · 19 days", "Mondays · 5 days",
 * the days themselves when there are a few, or how many and between which.
 * Hours that differ by day are named with each day, or given as a range.
 */
export const describeDays = (
  line: ListedLine,
  workingDays: string[],
): string => {
  const dates = line.days.map((day) => day.date);
  const count = daysCount(dates.length);

  if (line.sameMinutes === null) {
    return isNamed(line)
      ? line.days
          .map(
            (day) => `${dayLabel(day.date)} · ${formatDuration(day.minutes)}`,
          )
          .join(", ")
      : `${count}, ${hoursRange(line.days)} a day`;
  }

  if (
    workingDays.length > 1 &&
    workingDays.every((day) => dates.includes(day))
  ) {
    return `Every working day · ${count}`;
  }

  const weekday = fromISODate(dates[0]).getDay();
  const sameWeekday = (date: string) => fromISODate(date).getDay() === weekday;
  if (
    dates.length > 1 &&
    dates.every(sameWeekday) &&
    workingDays.filter(sameWeekday).every((day) => dates.includes(day))
  ) {
    return `${WEEKDAY_NAME.format(fromISODate(dates[0]))}s · ${count}`;
  }

  return isNamed(line)
    ? `${dates.map(dayLabel).join(", ")} · ${count}`
    : `${count}, ${formatDayMonthLabel(dates[0])} – ${formatDayMonthLabel(dates[dates.length - 1])}`;
};

/** What a row in "Set hours" says it changes: "All 3 days: … · was 1h, 2h, 2h". */
export const setHoursDetail = (line: ListedLine): string =>
  isNamed(line)
    ? `All ${daysCount(line.days.length)}: ${line.days.map((day) => dayLabel(day.date)).join(", ")} · was ${line.days.map((day) => formatDuration(day.minutes)).join(", ")}`
    : `All ${daysCount(line.days.length)} · was ${hoursRange(line.days)}`;

/** The preview's line for a listed row whose hours change on `changedDays`. */
export const listedChangeText = (
  line: ListedLine,
  minutes: number,
  changedDays: number,
): string =>
  line.sameMinutes !== null
    ? `change ${line.name} from ${formatDuration(line.sameMinutes)} to ${formatDuration(minutes)} on ${daysCount(changedDays)}`
    : isNamed(line)
      ? `set ${line.name} to ${formatDuration(minutes)} on ${line.days.map((day) => dayLabel(day.date)).join(", ")} (was ${line.days.map((day) => formatDuration(day.minutes)).join(", ")})`
      : `set ${line.name} to ${formatDuration(minutes)} on ${daysCount(line.days.length)} (was ${hoursRange(line.days)})`;

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
