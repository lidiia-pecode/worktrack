import {
  PeopleReportRow,
  ReportCoverage,
  ReportPart,
  ReportRange,
} from "@/types";

import {
  addDays,
  formatDayMonthLabel,
  formatDayRangeLabel,
  formatReportHours,
  fromISODate,
  isWeekend,
  toISODate,
} from "./date";
import { countLabel } from "./text";

/**
 * How far the period is counted and whether it can change: "Up to Oct 23 ·
 * open for edits" for a month, "Oct 1 – Nov 1 · open for edits" for a
 * `periodRange`, then the team's name when there is one.
 */
export const reportScope = (
  { countedUntil, isProvisional }: ReportCoverage,
  {
    periodRange,
    teamName,
  }: { periodRange?: ReportRange; teamName?: string } = {},
) => {
  const state = isProvisional ? "open for edits" : "locked";
  const parts = periodRange
    ? [
        `${formatDayMonthLabel(periodRange.dateFrom)} – ${formatDayMonthLabel(countedUntil ?? periodRange.dateTo)}`,
        state,
      ]
    : countedUntil
      ? [`Up to ${formatDayMonthLabel(countedUntil)}`, state]
      : [isProvisional ? "Open for edits" : "Locked"];
  if (teamName) parts.push(teamName);

  return parts.join(" · ");
};

/**
 * What the figures cover, as one label: the period's own name once it has
 * ended ("October 2026", "Q3 2026"), and while it runs the days counted so
 * far ("Nov 1 - Nov 7 so far"), from the company's first day for a year it
 * started in.
 */
export const shownPeriodLabel = (
  name: string,
  range: ReportRange,
  countedUntil: string | null,
) =>
  countedUntil
    ? `${formatDayRangeLabel(range.dateFrom, countedUntil)} so far`
    : name;

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

/** A team, the days in no team, or the viewer's own days outside the teams shown. */
export type PartKind = "team" | "noTeam" | "myTime";

/** The days a row has outside its teams: the viewer's own, or nobody's team. */
const outsidePartOf = (row: PeopleReportRow, viewerId?: string) => {
  const isOwn = row.userId === viewerId;
  return {
    id: isOwn ? "my-time" : "no-team",
    name: isOwn ? "My time" : "No team",
    kind: (isOwn ? "myTime" : "noTeam") as PartKind,
  };
};

/** One part of a person's period, as their panel shows it. */
export interface PersonPart extends ReportPart {
  id: string;
  name: string;
  kind: PartKind;
  /** In the report's view: the team filtered to, or every part without one. */
  isInReport: boolean;
}

/** A person's parts of the period in date order: their teams, then any days outside them. */
export const personParts = (
  row: PeopleReportRow,
  { teamId, viewerId }: { teamId?: string; viewerId?: string },
): PersonPart[] => {
  const parts: PersonPart[] = row.teams.map((team) => ({
    ...team,
    kind: "team",
    isInReport: !teamId || team.id === teamId,
  }));
  if (row.outsideTeams) {
    parts.push({
      ...row.outsideTeams,
      ...outsidePartOf(row, viewerId),
      isInReport: !teamId,
    });
  }

  const firstDay = (part: PersonPart) => part.spans[0]?.from ?? "";
  return parts.sort((a, b) => firstDay(a).localeCompare(firstDay(b)));
};

/** A part's days within the period: "Oct 1 - Oct 13", "From Oct 14". */
export const partDaysLabel = (part: PersonPart, range: ReportRange) =>
  part.spans
    .map((span) => {
      const from = span.from > range.dateFrom ? span.from : range.dateFrom;
      const lastDay = toISODate(addDays(fromISODate(span.until), -1));
      return lastDay >= range.dateTo && from > range.dateFrom
        ? `From ${formatDayMonthLabel(from)}`
        : formatDayRangeLabel(
            from,
            lastDay < range.dateTo ? lastDay : range.dateTo,
          );
    })
    .join(", ");

export type ReportDayKind =
  | "logged"
  /** Outside the view: another team's day, or after they left. */
  | "closed"
  | "off"
  | "withoutTime"
  | "nothingExpected"
  /** Today or a day to come with nothing on it yet. */
  | "pending";

/** Whether the day is counted yet: only finished days are. */
export type ReportDayWhen = "past" | "today" | "future";

export interface ReportDay {
  date: string;
  kind: ReportDayKind;
  when: ReportDayWhen;
  minutes: number;
}

type PersonDaysInput = {
  dateFrom: string;
  dateTo: string;
  /** The last day counted when the period reaches today; today follows it. */
  countedUntil: string | null;
  loggedByDate: Map<string, number>;
  /** A day the view doesn't hold; the API logs nothing on one. */
  isClosed: (date: string) => boolean;
  isOff: (date: string) => boolean;
  daysWithoutTime: Set<string>;
};

/**
 * A person's days in the period: each working day, and a weekend only when
 * time was logged on it. A finished day is logged, closed, off, without time
 * or with nothing expected (before they started, say); today and the days to
 * come show what is already on them, a day off or time, and are otherwise
 * pending.
 */
export const personDays = ({
  dateFrom,
  dateTo,
  countedUntil,
  loggedByDate,
  isClosed,
  isOff,
  daysWithoutTime,
}: PersonDaysInput): ReportDay[] => {
  const today =
    countedUntil && toISODate(addDays(fromISODate(countedUntil), 1));
  const days: ReportDay[] = [];

  for (
    let day = fromISODate(dateFrom);
    toISODate(day) <= dateTo;
    day = addDays(day, 1)
  ) {
    const date = toISODate(day);
    const minutes = loggedByDate.get(date) ?? 0;

    if (isWeekend(day) && minutes === 0) continue;

    const when: ReportDayWhen =
      !today || date < today ? "past" : date === today ? "today" : "future";
    const kind: ReportDayKind =
      minutes > 0
        ? "logged"
        : isClosed(date)
          ? "closed"
          : isOff(date)
            ? "off"
            : when !== "past"
              ? "pending"
              : daysWithoutTime.has(date)
                ? "withoutTime"
                : "nothingExpected";
    days.push({ date, kind, when, minutes });
  }

  return days;
};
