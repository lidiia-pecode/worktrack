import { HoursReportRow, PeopleReportRow } from "@/types";

import {
  addDays,
  formatDuration,
  formatSignedDuration,
  fromISODate,
  isWeekend,
  toISODate,
} from "./date";
import { countLabel } from "./text";

export const MINUTES_PER_HOUR = 60;

/** Tick steps, in hours, that read as round numbers on an axis. */
const TICK_STEPS_HOURS = [
  1, 2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 200, 250, 400, 500, 1000, 2000, 2500,
  5000,
];

/** An axis has at most this many intervals, so its labels never crowd. */
const MAX_TICK_INTERVALS = 4;

/** A narrow list, such as a panel's, keeps to fewer. */
export const NARROW_TICK_INTERVALS = 2;

export interface HourScale {
  /** Where the scale ends, a round number at or just above the largest figure. */
  endMinutes: number;
  /** From 0 to `endMinutes`, evenly spaced. */
  ticks: number[];
}

/** The hour scale a card or list shares, from its largest figure. */
export const hourScale = (
  maxMinutes: number,
  maxIntervals = MAX_TICK_INTERVALS,
): HourScale => {
  const maxHours = Math.max(maxMinutes / MINUTES_PER_HOUR, 1);
  const step =
    TICK_STEPS_HOURS.find((hours) => hours * maxIntervals >= maxHours) ??
    TICK_STEPS_HOURS.at(-1)!;
  const intervals = Math.ceil(maxHours / step);

  return {
    endMinutes: intervals * step * MINUTES_PER_HOUR,
    ticks: Array.from(
      { length: intervals + 1 },
      (_, i) => i * step * MINUTES_PER_HOUR,
    ),
  };
};

export interface BarValues {
  logged: number;
  /** Null or 0 when nothing was expected, so there is no line. */
  expected?: number | null;
  /** Null or 0 when nothing was planned, so there is no ring. */
  planned?: number | null;
}

export interface BarMarks {
  /** Logged up to the line, or up to the ring when there is no line. */
  loggedPercent: number;
  /** Logged past it, drawn striped; 0 when there is none. */
  pastPercent: number;
  linePercent: number | null;
  ringPercent: number | null;
}

/**
 * Where a bar's marks sit on its scale. Nothing missing is ever drawn at zero:
 * no expected hours means no line, no plan means no ring.
 */
export const barMarks = (
  { logged, expected, planned }: BarValues,
  { endMinutes }: HourScale,
): BarMarks => {
  const at = (minutes: number) => (minutes / endMinutes) * 100;
  // What the stripes start from: expected for a person, the plan for a project.
  const reference = expected || planned || 0;
  const solid = reference > 0 ? Math.min(logged, reference) : logged;

  return {
    loggedPercent: at(solid),
    pastPercent: at(logged - solid),
    linePercent: expected ? at(expected) : null,
    ringPercent: planned ? at(planned) : null,
  };
};

/** The scale for a list of Hours report rows: their logged and planned time. */
export const hourScaleOf = (rows: HoursReportRow[], maxIntervals?: number) =>
  hourScale(
    Math.max(
      0,
      ...rows.flatMap((row) => [row.totalMinutes, row.plannedMinutes ?? 0]),
    ),
    maxIntervals,
  );

/** "210h planned · +16h", or that there was no plan, never "0h planned". */
export const describeAgainstPlan = ({
  totalMinutes,
  plannedMinutes,
}: HoursReportRow) =>
  plannedMinutes
    ? `${formatDuration(plannedMinutes)} planned · ${formatSignedDuration(totalMinutes - plannedMinutes)}`
    : "not planned";

/** "3 people" on a project, or nothing when nobody is counted. */
export const peopleCountLabel = (count: number | null) =>
  count ? countLabel(count, "person", "people") : null;

export const daysOffLabel = (days: number) =>
  `${countLabel(days, "day", "days")} off`;

/** A share as a whole percentage; nothing of nothing is 0%. */
export const percentOf = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

export interface ClientGroup {
  key: string;
  /** Null for internal work: projects with no client. */
  name: string | null;
  loggedMinutes: number;
  billableMinutes: number;
  projects: HoursReportRow[];
}

const INTERNAL_WORK = "internal";

/**
 * Projects under their client, by the Hours report's client rule: names that
 * differ only in case are one client, shown with a spelling that has capitals.
 * Clients run by logged time, internal work last; projects keep their order.
 */
export const groupProjectsByClient = (
  projects: HoursReportRow[],
): ClientGroup[] => {
  const groups = new Map<string, ClientGroup>();

  for (const project of projects) {
    const key = project.detail?.toLowerCase() ?? INTERNAL_WORK;
    const group = groups.get(key) ?? {
      key,
      name: project.detail,
      loggedMinutes: 0,
      billableMinutes: 0,
      projects: [],
    };

    if (project.detail && project.detail !== project.detail.toLowerCase()) {
      group.name = project.detail;
    }
    group.loggedMinutes += project.totalMinutes;
    group.billableMinutes += project.billableMinutes;
    group.projects.push(project);
    groups.set(key, group);
  }

  return [...groups.values()].sort(
    (a, b) =>
      Number(a.key === INTERNAL_WORK) - Number(b.key === INTERNAL_WORK) ||
      b.loggedMinutes - a.loggedMinutes ||
      (a.name ?? "").localeCompare(b.name ?? ""),
  );
};

/** Up to this many people, every team starts open; past it, folded. */
export const PEOPLE_SHOWN_OPEN = 15;

export interface TeamGroup {
  /** The team's id, or "" for the people in no team. */
  id: string;
  name: string;
  people: PeopleReportRow[];
  loggedMinutes: number;
  expectedMinutes: number;
}

const NO_TEAM = "No team";

/**
 * People under each of their teams, so somebody in two teams is in both, and
 * those in no team last under "No team". Teams run by name, people keep their
 * order; each team's figures add up its people.
 */
export const groupPeopleByTeam = (people: PeopleReportRow[]): TeamGroup[] => {
  const groups = new Map<string, TeamGroup>();
  const add = (id: string, name: string, person: PeopleReportRow) => {
    const group = groups.get(id) ?? {
      id,
      name,
      people: [],
      loggedMinutes: 0,
      expectedMinutes: 0,
    };
    group.people.push(person);
    group.loggedMinutes += person.loggedMinutes;
    group.expectedMinutes += person.expectedMinutes;
    groups.set(id, group);
  };

  for (const person of people) {
    if (person.teams.length === 0) add("", NO_TEAM, person);
    for (const team of person.teams) add(team.id, team.name, person);
  }

  return [...groups.values()].sort(
    (a, b) =>
      Number(a.id === "") - Number(b.id === "") || a.name.localeCompare(b.name),
  );
};

/**
 * Up to this many days, about two months, a person's panel shows them day by
 * day; a longer period would be a wall of days.
 */
export const DAY_GRID_MAX_DAYS = 62;

export type ReportDayKind =
  "logged" | "off" | "withoutTime" | "today" | "nothingExpected";

export interface ReportDay {
  date: string;
  kind: ReportDayKind;
  minutes: number;
}

type PersonDaysInput = {
  dateFrom: string;
  dateTo: string;
  /** The last day counted when the period reaches today; then today follows it. */
  countedUntil: string | null;
  loggedByDate: Map<string, number>;
  isOff: (date: string) => boolean;
  daysWithoutTime: Set<string>;
};

/**
 * A person's working days in the period, each logged, off, without time or
 * with nothing expected (before they started, say), up to the last counted day
 * and then today. A weekend shows only when time was logged on it.
 */
export const personDays = ({
  dateFrom,
  dateTo,
  countedUntil,
  loggedByDate,
  isOff,
  daysWithoutTime,
}: PersonDaysInput): ReportDay[] => {
  const lastDay = countedUntil ?? dateTo;
  const days: ReportDay[] = [];

  for (
    let day = fromISODate(dateFrom);
    toISODate(day) <= lastDay;
    day = addDays(day, 1)
  ) {
    const date = toISODate(day);
    const minutes = loggedByDate.get(date) ?? 0;

    if (isWeekend(day) && minutes === 0) continue;

    const kind: ReportDayKind =
      minutes > 0
        ? "logged"
        : isOff(date)
          ? "off"
          : daysWithoutTime.has(date)
            ? "withoutTime"
            : "nothingExpected";
    days.push({ date, kind, minutes });
  }

  const today =
    countedUntil && toISODate(addDays(fromISODate(countedUntil), 1));
  if (
    today &&
    today >= dateFrom &&
    today <= dateTo &&
    !isWeekend(fromISODate(today))
  ) {
    days.push({ date: today, kind: "today", minutes: 0 });
  }

  return days;
};
