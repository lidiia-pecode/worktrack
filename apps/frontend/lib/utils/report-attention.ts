import { HoursReportRow, PeopleReportRow } from "@/types";

import {
  formatDayMonthLabel,
  formatDuration,
  formatSignedDuration,
} from "./date";
import { countLabel } from "./text";

/** A gap has to be at least this big, in minutes, to need attention. */
export const ATTENTION_MIN_MINUTES = 8 * 60;

/** And more than this share of what it is measured against. */
export const ATTENTION_MIN_SHARE = 0.1;

/** Names, days or projects spelled out before the rest are counted. */
const NAMED_IN_FULL = 3;
const LARGEST_PROJECTS_NAMED = 2;

export type AttentionKind =
  "daysWithoutTime" | "projectsOffPlan" | "plannedBeyondHours";

/** One kind of problem in the month, said once however many it covers. */
export interface AttentionFact {
  kind: AttentionKind;
  headline: string;
  detail: string;
  /** The one person or project the fact is about, for its action. */
  subjectId?: string;
}

const isBigGap = (gap: number, reference: number) =>
  Math.abs(gap) >= ATTENTION_MIN_MINUTES &&
  Math.abs(gap) > reference * ATTENTION_MIN_SHARE;

/** "a, b and c", or "a, b, c and 2 more". */
const listOf = (names: string[]) => {
  const named = names.slice(0, NAMED_IN_FULL);
  const rest = names.length - named.length;

  if (rest > 0) return `${named.join(", ")} and ${rest} more`;
  if (named.length === 1) return named[0];
  return `${named.slice(0, -1).join(", ")} and ${named.at(-1)}`;
};

const daysWithoutTimeFact = (
  people: PeopleReportRow[],
): AttentionFact | null => {
  const missing = people
    .filter((person) => person.daysWithoutTime.length > 0)
    .sort(
      (a, b) =>
        b.daysWithoutTime.length - a.daysWithoutTime.length ||
        a.name.localeCompare(b.name),
    );
  if (missing.length === 0) return null;

  if (missing.length === 1) {
    const [person] = missing;
    return {
      kind: "daysWithoutTime",
      headline: `${person.name} has ${countLabel(person.daysWithoutTime.length, "day", "days")} with no time logged`,
      detail: listOf(person.daysWithoutTime.map(formatDayMonthLabel)),
      subjectId: person.userId,
    };
  }

  return {
    kind: "daysWithoutTime",
    headline: `${missing.length} people have days with no time logged`,
    detail: listOf(
      missing.map(
        (person) => `${person.name} · ${person.daysWithoutTime.length}`,
      ),
    ),
  };
};

/** How far a project is off its plan, or all its time when it has none; 0 when close enough. */
const offPlanGap = ({ totalMinutes, plannedMinutes }: HoursReportRow) => {
  if (!plannedMinutes) {
    return totalMinutes >= ATTENTION_MIN_MINUTES ? totalMinutes : 0;
  }
  const gap = totalMinutes - plannedMinutes;
  return isBigGap(gap, plannedMinutes) ? gap : 0;
};

const describeGap = (project: HoursReportRow) =>
  project.plannedMinutes
    ? `${project.name} ${formatSignedDuration(offPlanGap(project))}`
    : `${project.name}, ${formatDuration(project.totalMinutes)} with no plan`;

const projectsOffPlanFact = (
  projects: HoursReportRow[],
): AttentionFact | null => {
  const offPlan = projects
    .filter((project) => offPlanGap(project) !== 0)
    .sort((a, b) => Math.abs(offPlanGap(b)) - Math.abs(offPlanGap(a)));
  if (offPlan.length === 0) return null;

  if (offPlan.length === 1) {
    const [project] = offPlan;
    return {
      kind: "projectsOffPlan",
      headline: `${project.name} is more than 10% off plan`,
      detail: project.plannedMinutes
        ? `${formatDuration(project.totalMinutes)} logged of ${formatDuration(project.plannedMinutes)} planned`
        : `${formatDuration(project.totalMinutes)} logged with no plan`,
      subjectId: project.id!,
    };
  }

  return {
    kind: "projectsOffPlan",
    headline: `${offPlan.length} projects are more than 10% off plan`,
    detail: `Largest: ${offPlan
      .slice(0, LARGEST_PROJECTS_NAMED)
      .map(describeGap)
      .join(" · ")}`,
  };
};

/** A plan beyond what someone can work is a planning fact, not a verdict on them. */
const plannedBeyondHoursFact = (
  people: PeopleReportRow[],
): AttentionFact | null => {
  const overPlanned = people.filter(
    ({ plannedMinutes, expectedMinutes }) =>
      plannedMinutes > expectedMinutes &&
      isBigGap(plannedMinutes - expectedMinutes, expectedMinutes),
  );
  if (overPlanned.length === 0) return null;

  if (overPlanned.length === 1) {
    const [person] = overPlanned;
    return {
      kind: "plannedBeyondHours",
      headline: `${person.name} is planned beyond their hours`,
      detail: `${formatDuration(person.plannedMinutes)} planned, ${formatDuration(person.expectedMinutes)} expected`,
      subjectId: person.userId,
    };
  }

  return {
    kind: "plannedBeyondHours",
    headline: `${overPlanned.length} people are planned beyond their hours`,
    detail: listOf(overPlanned.map((person) => person.name)),
  };
};

/**
 * At most one fact per kind of problem, so the month's problems read at a
 * glance: missing time first, then the plans. Nothing is about someone logging
 * less than expected (D3).
 */
export const attentionFacts = (
  people: PeopleReportRow[],
  projects: HoursReportRow[],
): AttentionFact[] =>
  [
    daysWithoutTimeFact(people),
    projectsOffPlanFact(projects),
    plannedBeyondHoursFact(people),
  ].filter((fact): fact is AttentionFact => fact !== null);
