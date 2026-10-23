import { PeopleReportRow } from "@/types";

import { addDays, fromISODate, isWeekend, toISODate } from "./date";
import { countLabel } from "./text";

const MINUTES_PER_HOUR = 60;

/** Tick steps, in hours, that read as round numbers on an axis. */
const TICK_STEPS_HOURS = [
  1, 2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 200, 250, 400, 500, 1000, 2000, 2500,
  5000,
];

/** An axis has at most this many intervals, so its labels never crowd. */
const MAX_TICK_INTERVALS = 4;

export interface HourScale {
  /** Where the scale ends, a round number at or just above the largest figure. */
  endMinutes: number;
  /** From 0 to `endMinutes`, evenly spaced. */
  ticks: number[];
}

/** The hour scale of the Week by week chart, from its largest figure. */
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

export const daysOffLabel = (days: number) =>
  `${countLabel(days, "day", "days")} off`;

/** A share as a whole percentage; nothing of nothing is 0%. */
export const percentOf = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

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
