import { HoursReportRow, PeopleReportRow } from "@/types";

import { formatDayMonthLabel, formatDuration } from "./date";

/** A gap has to be at least this big, in minutes, to be worth a look. */
export const ATTENTION_MIN_MINUTES = 8 * 60;

/** And more than this share of what it is measured against. */
export const ATTENTION_MIN_SHARE = 0.1;

/** The list shows this many at first, so it stays a short read; the rest open on request. */
export const ATTENTION_SHOWN_AT_FIRST = 3;

/** Days or people named one by one before the rest are counted. */
const NAMED_IN_FULL = 3;

export type AttentionKind =
  | "projectOffPlan"
  | "projectWithoutPlan"
  | "plannedBeyondExpected"
  | "daysWithoutTime"
  | "teamDaysWithoutTime";

export interface AttentionItem {
  kind: AttentionKind;
  /** The project's or the person's id, for the item's action; empty for the team. */
  subjectId: string;
  who: string;
  what: string;
  why: string;
  /** How big the fact is, in minutes, to put the largest first. */
  minutes: number;
}

const isBigGap = (gap: number, reference: number) =>
  Math.abs(gap) >= ATTENTION_MIN_MINUTES &&
  Math.abs(gap) > reference * ATTENTION_MIN_SHARE;

const peopleText = (count: number | null) =>
  count ? `${count} ${count === 1 ? "person" : "people"}` : null;

const projectContext = (project: HoursReportRow) =>
  [project.detail ?? "Internal work", peopleText(project.peopleCount)]
    .filter(Boolean)
    .join(" · ");

const projectItem = (project: HoursReportRow): AttentionItem | null => {
  const logged = project.totalMinutes;
  const planned = project.plannedMinutes ?? 0;
  const base = {
    subjectId: project.id!,
    who: project.name ?? "",
    why: projectContext(project),
  };

  if (planned === 0) {
    return logged >= ATTENTION_MIN_MINUTES
      ? {
          ...base,
          kind: "projectWithoutPlan",
          what: `has ${formatDuration(logged)} logged and no plan`,
          minutes: logged,
        }
      : null;
  }

  const gap = logged - planned;
  if (!isBigGap(gap, planned)) return null;

  return {
    ...base,
    kind: "projectOffPlan",
    what:
      gap > 0
        ? `has ${formatDuration(gap)} more logged than planned`
        : `has ${formatDuration(logged)} logged of ${formatDuration(planned)} planned`,
    minutes: Math.abs(gap),
  };
};

const daysOff = (days: number) => `${days} ${days === 1 ? "day" : "days"} off`;

/** A plan beyond what someone can work is a planning fact, not a verdict on them. */
const plannedBeyondItem = (person: PeopleReportRow): AttentionItem | null => {
  const gap = person.plannedMinutes - person.expectedMinutes;
  if (gap <= 0 || !isBigGap(gap, person.expectedMinutes)) return null;

  return {
    kind: "plannedBeyondExpected",
    subjectId: person.userId,
    who: person.name,
    what: `is planned for ${formatDuration(person.plannedMinutes)} but expected to work ${formatDuration(person.expectedMinutes)}`,
    why:
      person.timeOffDays > 0
        ? `${daysOff(person.timeOffDays)} leave less room than the plan assumes`
        : "The plan is more than their working hours",
    minutes: gap,
  };
};

/** "a, b and c", or "a, b, c and 2 more". */
const listOf = (names: string[]) => {
  const named = names.slice(0, NAMED_IN_FULL);
  const rest = names.length - named.length;

  if (rest > 0) return `${named.join(", ")} and ${rest} more`;
  if (named.length === 1) return named[0];
  return `${named.slice(0, -1).join(", ")} and ${named.at(-1)}`;
};

const workingDays = (days: number) =>
  `${days} working ${days === 1 ? "day" : "days"}`;

const INVOICE_NOTE = "Worth checking before you invoice.";

/**
 * Missing days are one item: one person's, named by date, or the team's,
 * named by person, so a half-logged month doesn't push every other fact out.
 */
const daysWithoutTimeItem = (
  people: PeopleReportRow[],
  standardDayMinutes: number,
): AttentionItem | null => {
  const missing = people
    .filter((person) => person.daysWithoutTime.length > 0)
    .sort(
      (a, b) =>
        b.daysWithoutTime.length - a.daysWithoutTime.length ||
        a.name.localeCompare(b.name),
    );
  if (missing.length === 0) return null;

  const days = missing.reduce(
    (sum, person) => sum + person.daysWithoutTime.length,
    0,
  );
  // A day counts as a standard day, so it compares with the hour gaps.
  const minutes = days * standardDayMinutes;

  if (missing.length === 1) {
    const [person] = missing;
    return {
      kind: "daysWithoutTime",
      subjectId: person.userId,
      who: person.name,
      what: `has ${workingDays(days)} with no time logged`,
      why: `${listOf(person.daysWithoutTime.map(formatDayMonthLabel))}. ${INVOICE_NOTE}`,
      minutes,
    };
  }

  return {
    kind: "teamDaysWithoutTime",
    subjectId: "",
    who: `${missing.length} people`,
    what: `have ${workingDays(days)} with no time logged between them`,
    why: `${listOf(
      missing.map(
        (person) => `${person.name} (${person.daysWithoutTime.length})`,
      ),
    )}. ${INVOICE_NOTE}`,
    minutes,
  };
};

/**
 * The few facts in a period worth a manager's look, largest first. They point
 * at plans and missing time, never at someone logging less than expected (D3).
 */
export const attentionItems = (
  people: PeopleReportRow[],
  projects: HoursReportRow[],
  standardDayMinutes: number,
): AttentionItem[] =>
  [
    ...projects.map(projectItem),
    ...people.map(plannedBeyondItem),
    daysWithoutTimeItem(people, standardDayMinutes),
  ]
    .filter((item): item is AttentionItem => item !== null)
    .sort((a, b) => b.minutes - a.minutes || a.who.localeCompare(b.who));
