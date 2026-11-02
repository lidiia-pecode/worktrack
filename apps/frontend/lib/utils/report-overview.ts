import {
  PeopleReportFigures,
  PeopleReportRow,
  ReportCoverage,
  ReportRange,
} from "@/types";

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
 * One line saying how far the period is counted, whether it can still change,
 * and whose figures they are: "Up to Oct 23 · open for edits · your teams" for
 * a month, whose name says its dates, and "Oct 1 – Nov 1 · open for edits"
 * for any other period, given as `periodRange`.
 */
export const reportScope = (
  { countedUntil, isProvisional }: ReportCoverage,
  isManager: boolean,
  periodRange?: ReportRange,
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

/** One figure's change from the previous period: its share in points, and the hours behind it. */
export interface FigureChange {
  points: number;
  minutes: number;
  /** Both shares as the page shows them, whole percentages. */
  share: number;
  previousShare: number;
}

export interface PeriodChange {
  logged: FigureChange | null;
  planned: FigureChange | null;
  billable: FigureChange | null;
}

type ChangeFigures = Pick<
  PeopleReportFigures,
  "loggedMinutes" | "plannedMinutes" | "billableMinutes" | "expectedMinutes"
>;

/**
 * Each figure's share against the previous period's, in percentage points
 * between the shares as the page shows them, so 94% after 90% is 4. Shares,
 * not hours, since periods differ in working days and people (Phase 42,
 * decision 5). A figure has none when either period has nothing to measure it
 * against: no expected hours for logged and planned, no logged time for
 * billable.
 */
export const periodChange = (
  current: ChangeFigures,
  previous: ChangeFigures,
): PeriodChange => {
  const change = (
    part: (figures: ChangeFigures) => number,
    whole: (figures: ChangeFigures) => number,
  ) =>
    shareChange(
      { part: part(current), whole: whole(current) },
      { part: part(previous), whole: whole(previous) },
    );

  return {
    logged: change(
      (figures) => figures.loggedMinutes,
      (figures) => figures.expectedMinutes,
    ),
    planned: change(
      (figures) => figures.plannedMinutes,
      (figures) => figures.expectedMinutes,
    ),
    billable: change(
      (figures) => figures.billableMinutes,
      (figures) => figures.loggedMinutes,
    ),
  };
};

/**
 * One share against the previous period's, as `periodChange` compares each
 * figure; a team row compares its logged share the same way.
 */
export const shareChange = (
  current: { part: number; whole: number },
  previous: { part: number; whole: number },
): FigureChange | null => {
  if (current.whole === 0 || previous.whole === 0) return null;

  const share = percentOf(current.part, current.whole);
  const previousShare = percentOf(previous.part, previous.whole);
  return {
    points: share - previousShare,
    minutes: current.part - previous.part,
    share,
    previousShare,
  };
};

/** "4 pts", "1 pt": the size of a change; its direction is an icon beside it. */
export const changeLabel = ({ points }: FigureChange) => {
  const size = Math.abs(points);
  return `${size} ${size === 1 ? "pt" : "pts"}`;
};

/**
 * What a change means, for its tip: "Down 3 points from September 2026" over
 * "97% → 94% · about 109h less", or one line, "Same as September 2026 · 89%".
 */
export const changeTip = (change: FigureChange, previousName: string) => {
  const { points, minutes, share, previousShare } = change;
  if (points === 0) return [`Same as ${previousName} · ${share}%`];

  const size = Math.abs(points);
  const hours =
    minutes === 0
      ? "the same hours"
      : `about ${formatReportHours(Math.abs(minutes))} ${minutes > 0 ? "more" : "less"}`;
  return [
    `${points > 0 ? "Up" : "Down"} ${size} ${size === 1 ? "point" : "points"} from ${previousName}`,
    `${previousShare}% → ${share}% · ${hours}`,
  ];
};

/** Up to this many people, every team starts open; past it, folded. */
export const PEOPLE_SHOWN_OPEN = 15;

export interface TeamGroup {
  /** The team's id, or "" for the people in no team. */
  id: string;
  name: string;
  people: PeopleReportRow[];
  loggedMinutes: number;
  billableMinutes: number;
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
      billableMinutes: 0,
      expectedMinutes: 0,
    };
    group.people.push(person);
    group.loggedMinutes += person.loggedMinutes;
    group.billableMinutes += person.billableMinutes;
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
  | "logged"
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
  isOff: (date: string) => boolean;
  daysWithoutTime: Set<string>;
};

/**
 * A person's days in the period: each working day, and a weekend only when
 * time was logged on it. A finished day is logged, off, without time or with
 * nothing expected (before they started, say); today and the days to come
 * show what is already on them, a day off or time, and are otherwise pending.
 */
export const personDays = ({
  dateFrom,
  dateTo,
  countedUntil,
  loggedByDate,
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
