import { HoursReportRow, PeopleReportRow } from "@/types";

import {
  addDays,
  formatDayMonthLabel,
  formatReportHours,
  fromISODate,
  toISODate,
} from "./date";
import { countLabel } from "./text";

/** A gap has to be at least this big, in minutes, to need attention. */
const ATTENTION_MIN_MINUTES = 8 * 60;

/** And more than this share of what it is measured against. */
const ATTENTION_MIN_SHARE = 0.1;

/** Days spelled out for one person before the rest are counted. */
const DAYS_NAMED = 3;

const FRIDAY = 5;

export type AttentionKind = "daysWithoutTime" | "projectsOffPlan";

/** A person or a project named in Needs attention; it opens their panel. */
export interface AttentionItem {
  id: string;
  label: string;
}

/** One kind of problem in the month, said once however many it covers. */
export interface AttentionFact {
  kind: AttentionKind;
  /** The one person or project it is about, named at the start of the sentence. */
  subject?: AttentionItem;
  /** The sentence, after the subject's name when there is one. */
  headline: string;
  /** What the sentence covers: "up to Oct 16", "your teams' share". */
  note?: string;
  /** About the one subject: their days or their hours. */
  detail?: string;
  /** For several, each one, largest first. */
  items: AttentionItem[];
}

export interface ReportAttention {
  facts: AttentionFact[];
  /** Why a person or a project is marked, by id, for the dot beside its row. */
  people: Map<string, string>;
  projects: Map<string, string>;
}

type AttentionInput = {
  people: PeopleReportRow[];
  projects: HoursReportRow[];
  /** The last day counted when the month is still running, else null. */
  countedUntil: string | null;
  isManager: boolean;
};

const isBigGap = (gap: number, reference: number) =>
  Math.abs(gap) >= ATTENTION_MIN_MINUTES &&
  Math.abs(gap) > reference * ATTENTION_MIN_SHARE;

/** "a, b and c", or "a, b, c and 2 more". */
const listOf = (names: string[]) => {
  const named = names.slice(0, DAYS_NAMED);
  const rest = names.length - named.length;

  if (rest > 0) return `${named.join(", ")} and ${rest} more`;
  if (named.length === 1) return named[0];
  return `${named.slice(0, -1).join(", ")} and ${named.at(-1)}`;
};

/**
 * While the month runs, missing time counts only for weeks that have ended,
 * since many people log their week on Friday: up to the last Friday on or
 * before the last counted day. A finished month counts every day (Decision 35).
 */
export const lastCheckedDay = (countedUntil: string) => {
  let day = fromISODate(countedUntil);
  while (day.getDay() !== FRIDAY) day = addDays(day, -1);
  return toISODate(day);
};

const missingDaysOf = (
  people: PeopleReportRow[],
  checkedUntil: string | null,
) =>
  people
    .map((person) => ({
      person,
      days: checkedUntil
        ? person.daysWithoutTime.filter((date) => date <= checkedUntil)
        : person.daysWithoutTime,
    }))
    .filter(({ days }) => days.length > 0)
    .sort(
      (a, b) =>
        b.days.length - a.days.length ||
        a.person.name.localeCompare(b.person.name),
    );

const daysWithoutTimeFact = (
  missing: ReturnType<typeof missingDaysOf>,
  checkedUntil: string | null,
): AttentionFact | null => {
  if (missing.length === 0) return null;

  const note = checkedUntil
    ? `up to ${formatDayMonthLabel(checkedUntil)}`
    : undefined;

  if (missing.length === 1) {
    const [{ person, days }] = missing;
    return {
      kind: "daysWithoutTime",
      subject: { id: person.userId, label: person.name },
      headline: `has ${countLabel(days.length, "day", "days")} with no time logged`,
      note,
      detail: listOf(days.map(formatDayMonthLabel)),
      items: [],
    };
  }

  return {
    kind: "daysWithoutTime",
    headline: `${missing.length} people have days with no time logged`,
    note,
    items: missing.map(({ person, days }) => ({
      id: person.userId,
      label: `${person.name} · ${days.length}`,
    })),
  };
};

/**
 * How far a project is off its plan, or all its time when it has none; 0 when
 * it needs no attention. Unplanned time counts only on a client project, since
 * internal work is often left unplanned on purpose; while the month runs, only
 * time over the plan counts, since late logging only lowers logged time
 * (Decision 36).
 */
const offPlanGap = (
  { totalMinutes, plannedMinutes, detail: client }: HoursReportRow,
  isMonthRunning: boolean,
) => {
  if (!plannedMinutes) {
    return client && totalMinutes >= ATTENTION_MIN_MINUTES ? totalMinutes : 0;
  }
  const gap = totalMinutes - plannedMinutes;
  if (isMonthRunning && gap < 0) return 0;
  return isBigGap(gap, plannedMinutes) ? gap : 0;
};

const signedHours = (minutes: number) =>
  `${minutes > 0 ? "+" : "−"}${formatReportHours(Math.abs(minutes))}`;

const projectsOffPlanFact = (
  offPlan: { project: HoursReportRow; gap: number }[],
  isManager: boolean,
): AttentionFact | null => {
  if (offPlan.length === 0) return null;

  const note = isManager ? "your teams' share" : undefined;

  if (offPlan.length === 1) {
    const [{ project }] = offPlan;
    const subject = { id: project.id, label: project.name };
    return project.plannedMinutes
      ? {
          kind: "projectsOffPlan",
          subject,
          headline: "is more than 10% off plan",
          note,
          detail: `${formatReportHours(project.totalMinutes)} logged of ${formatReportHours(project.plannedMinutes)} planned`,
          items: [],
        }
      : {
          kind: "projectsOffPlan",
          subject,
          headline: `has ${formatReportHours(project.totalMinutes)} logged with no plan`,
          note,
          detail: "Nothing was planned on it this month",
          items: [],
        };
  }

  // A project with time and no plan isn't "off" a plan, so the headline says both.
  const hasUnplanned = offPlan.some(({ project }) => !project.plannedMinutes);
  return {
    kind: "projectsOffPlan",
    headline: hasUnplanned
      ? `${offPlan.length} projects are off plan or not planned`
      : `${offPlan.length} projects are more than 10% off plan`,
    note,
    items: offPlan.map(({ project, gap }) => ({
      id: project.id,
      label: project.plannedMinutes
        ? `${project.name} · ${signedHours(gap)}`
        : `${project.name} · ${formatReportHours(project.totalMinutes)} with no plan`,
    })),
  };
};

/**
 * What needs attention in an open month, at most one fact per kind of
 * problem — missing time first, then the plans — with the people and projects
 * it names, so a dot beside a row always matches the section. Nothing is
 * about someone logging less than expected (D3), and a plan beyond someone's
 * hours is left to Planning (Decision 37).
 */
export const reportAttention = ({
  people,
  projects,
  countedUntil,
  isManager,
}: AttentionInput): ReportAttention => {
  const checkedUntil = countedUntil && lastCheckedDay(countedUntil);
  const missing = missingDaysOf(people, checkedUntil);
  const offPlan = projects
    .map((project) => ({
      project,
      gap: offPlanGap(project, countedUntil !== null),
    }))
    .filter(({ gap }) => gap !== 0)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  return {
    facts: [
      daysWithoutTimeFact(missing, checkedUntil),
      projectsOffPlanFact(offPlan, isManager),
    ].filter((fact): fact is AttentionFact => fact !== null),
    people: new Map(
      missing.map(({ person, days }) => [
        person.userId,
        `${countLabel(days.length, "day", "days")} with no time logged`,
      ]),
    ),
    projects: new Map(
      offPlan.map(({ project }) => [
        project.id,
        project.plannedMinutes
          ? "More than 10% off plan"
          : "Logged with no plan",
      ]),
    ),
  };
};

/** Nothing marked, for a locked month (Decision 34). */
export const NO_ATTENTION: ReportAttention = {
  facts: [],
  people: new Map(),
  projects: new Map(),
};
