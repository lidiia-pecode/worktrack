import { PlanningWeekRow, TeamSummaryRow } from "@/types";

import { fullName } from "./user";

/** By name, or by the week's total: logged time on Team time, planned on Planning. */
export type TeamSortKey = "name" | "total";
export type SortDirection = "asc" | "desc";
export type TeamSort = { key: TeamSortKey; direction: SortDirection };

export const DEFAULT_TEAM_SORT: TeamSort = { key: "name", direction: "asc" };

const SORT_PARAM_VALUES: Record<string, TeamSort> = {
  name: DEFAULT_TEAM_SORT,
  "name-desc": { key: "name", direction: "desc" },
  total: { key: "total", direction: "asc" },
  "total-desc": { key: "total", direction: "desc" },
};

/** The sort a `?sort=` value names; the default for anything else. */
export const readTeamSort = (value: string | null): TeamSort =>
  (value && SORT_PARAM_VALUES[value]) || DEFAULT_TEAM_SORT;

/** The `?sort=` value for a sort; none for the default, which stays out of the address. */
export const teamSortParam = (sort: TeamSort): string | undefined => {
  if (sort.key === DEFAULT_TEAM_SORT.key && sort.direction === "asc") {
    return undefined;
  }

  return sort.direction === "asc" ? sort.key : `${sort.key}-desc`;
};

/** Pressing the sorted button reverses it; another button starts ascending. */
export const nextTeamSort = (sort: TeamSort, key: TeamSortKey): TeamSort =>
  sort.key === key
    ? { key, direction: sort.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" };

type PersonRow = Pick<TeamSummaryRow, "user">;

const byName = (a: PersonRow, b: PersonRow) =>
  fullName(a.user).localeCompare(fullName(b.user));

/**
 * By name, or by a figure the grid compares; a row without one (nothing
 * expected or available) always goes last, and equal figures fall back to the
 * name.
 */
const sortRows = <Row extends PersonRow>(
  rows: Row[],
  sort: TeamSort,
  figureOf: (row: Row) => number | null,
) => {
  const sign = sort.direction === "asc" ? 1 : -1;

  const compareFigures = (a: Row, b: Row) => {
    const figureA = figureOf(a);
    const figureB = figureOf(b);
    if (figureA === null || figureB === null) {
      return Number(figureA === null) - Number(figureB === null);
    }

    return sign * (figureA - figureB);
  };

  return [...rows].sort((a, b) =>
    sort.key === "name"
      ? sign * byName(a, b)
      : compareFigures(a, b) || byName(a, b),
  );
};

/** How much of the time expected so far is logged; null when nothing was expected. */
const loggedShare = (row: TeamSummaryRow) =>
  row.expectedToDateMinutes > 0
    ? row.minutes / row.expectedToDateMinutes
    : null;

/**
 * Logged compares the share of what was expected so far, so part-timers aren't
 * always at the bottom; under a project filter it compares the project's
 * minutes. Someone expected nothing has no share and always goes last.
 */
export const sortTeamRows = (
  rows: TeamSummaryRow[],
  sort: TeamSort,
  { byProject }: { byProject: boolean },
) =>
  sortRows(rows, sort, (row) => (byProject ? row.minutes : loggedShare(row)));

/**
 * Planned compares the share of the week's available hours, as Logged does on
 * Team time; under a project filter the project's planned minutes. Someone
 * with nothing available always goes last.
 */
export const sortPlanningRows = (
  rows: PlanningWeekRow[],
  sort: TeamSort,
  { byProject }: { byProject: boolean },
) =>
  sortRows(rows, sort, (row) => {
    if (byProject) return row.plannedMinutes;
    return row.availableMinutes > 0
      ? row.plannedMinutes / row.availableMinutes
      : null;
  });

/** By name or position, ignoring case; for any grid with a person per row. */
export const searchTeamRows = <Row extends PersonRow>(
  rows: Row[],
  search: string,
): Row[] => {
  const query = search.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) =>
    [fullName(row.user), row.user.position ?? ""].some((text) =>
      text.toLowerCase().includes(query),
    ),
  );
};
