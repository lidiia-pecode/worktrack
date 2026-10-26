import { PeopleReportRow, ReportCoverage } from "@/types";

import {
  addDays,
  formatDayMonthLabel,
  formatReportHours,
  fromISODate,
  isWeekend,
  toISODate,
} from "./date";
import { countLabel } from "./text";

/**
 * One line saying how far the month is counted, whether it can still change,
 * and whose figures they are: "Up to Oct 23 · open for edits · your teams".
 */
export const reportScope = (
  { countedUntil, isProvisional }: ReportCoverage,
  isManager: boolean,
) => {
  const state = isProvisional ? "open for edits" : "locked";
  const parts = countedUntil
    ? [`Up to ${formatDayMonthLabel(countedUntil)}`, state]
    : [isProvisional ? "Open for edits" : "Locked"];
  if (isManager) parts.push("your teams");

  return parts.join(" · ");
};

/** "96h of 120h", or the hours alone when nothing was expected. */
export const againstExpected = (logged: number, expected: number) =>
  expected > 0
    ? `${formatReportHours(logged)} of ${formatReportHours(expected)}`
    : formatReportHours(logged);

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
