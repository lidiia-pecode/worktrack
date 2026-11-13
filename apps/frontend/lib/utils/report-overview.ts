import { PeopleReportRow, ReportPart, ReportRange, ReportTeam } from "@/types";

import {
  addDays,
  formatDayMonthLabel,
  formatDayRangeLabel,
  formatReportHours,
  fromISODate,
  isWeekend,
  toISODate,
} from "./date";

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

/** "96h of 120h", or the hours alone with nothing to measure them against. */
export const hoursAgainst = (minutes: number, reference: number | null) =>
  reference
    ? `${formatReportHours(minutes)} of ${formatReportHours(reference)}`
    : formatReportHours(minutes);

/** A share as a whole percentage; nothing of nothing is 0%. */
export const percentOf = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/** The days a row has outside its teams: the viewer's own, or nobody's team. */
const outsidePartOf = (row: PeopleReportRow, viewerId?: string) => {
  const isOwn = row.userId === viewerId;
  return {
    id: isOwn ? "my-time" : "no-team",
    name: isOwn ? "My time" : "No team",
    isArchived: false,
  };
};

/** A person's parts of the period in date order: their teams, then any days outside them. */
export const personParts = (
  row: PeopleReportRow,
  viewerId?: string,
): ReportTeam[] => {
  const parts = [...row.teams];
  if (row.outsideTeams) {
    parts.push({ ...row.outsideTeams, ...outsidePartOf(row, viewerId) });
  }

  const firstDay = (part: ReportPart) => part.spans[0]?.from ?? "";
  return parts.sort((a, b) => firstDay(a).localeCompare(firstDay(b)));
};

/** A part's days within the period: "Oct 1 - Oct 13", "From Oct 14". */
export const partDaysLabel = (part: ReportPart, range: ReportRange) =>
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
