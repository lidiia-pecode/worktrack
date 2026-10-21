import { HoursReportRow, PeopleReportRow } from "@/types";

/** How far past its reference a target bar reaches before it is cut off. */
export const TARGET_BAR_CAP = 1.5;

/**
 * Where the reference sits along every target bar, as a percentage of its
 * width, so rows compare at a glance whatever their size.
 */
export const REFERENCE_PERCENT = 100 / TARGET_BAR_CAP;

/** A planned project this close to its plan, as a share of it, counts as close to plan. */
export const CLOSE_TO_PLAN_SHARE = 0.1;

export interface TargetBarGeometry {
  /** The part up to the reference, as a percentage of the bar. */
  filledPercent: number;
  /** The part past the reference, as a percentage of the bar. */
  pastPercent: number;
  /** True when the value runs beyond the bar's end. */
  isCapped: boolean;
}

/** Null when there is no reference to measure against. */
export const targetBarGeometry = (
  value: number,
  reference: number,
): TargetBarGeometry | null => {
  if (reference <= 0) return null;

  const ratio = value / reference;
  const shown = Math.min(ratio, TARGET_BAR_CAP);

  return {
    filledPercent: (Math.min(shown, 1) / TARGET_BAR_CAP) * 100,
    pastPercent: (Math.max(shown - 1, 0) / TARGET_BAR_CAP) * 100,
    isCapped: ratio > TARGET_BAR_CAP,
  };
};

/** Where a second value, such as the plan, sits along the same bar. */
export const markerPercent = (value: number, reference: number) =>
  (Math.min(value / reference, TARGET_BAR_CAP) / TARGET_BAR_CAP) * 100;

/** A share as a whole percentage; nothing of nothing is 0%. */
export const percentOf = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

export const isCloseToPlan = ({
  totalMinutes,
  plannedMinutes,
}: HoursReportRow) =>
  Boolean(plannedMinutes) &&
  Math.abs(totalMinutes - plannedMinutes!) <=
    plannedMinutes! * CLOSE_TO_PLAN_SHARE;

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

export type TeamSort = "name" | "logged" | "planned";

export const TEAM_SORTS: { value: TeamSort; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "logged", label: "Logged vs expected" },
  { value: "planned", label: "Planned vs expected" },
];

// People with nothing expected have no ratio, so they go last.
const ratioOf = (minutes: number, expectedMinutes: number) =>
  expectedMinutes > 0 ? minutes / expectedMinutes : -1;

/** A sorted copy; the ratios run largest first, equal ones by name. */
export const sortPeople = (
  people: PeopleReportRow[],
  sort: TeamSort,
): PeopleReportRow[] => {
  const byName = (a: PeopleReportRow, b: PeopleReportRow) =>
    a.name.localeCompare(b.name);

  if (sort === "name") return [...people].sort(byName);

  const field = sort === "logged" ? "loggedMinutes" : "plannedMinutes";
  return [...people].sort(
    (a, b) =>
      ratioOf(b[field], b.expectedMinutes) -
        ratioOf(a[field], a.expectedMinutes) || byName(a, b),
  );
};
