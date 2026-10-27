import { TeamSummaryRow } from "@/types";

import { fullName } from "./user";

export type TeamSortKey = "name" | "logged";
export type SortDirection = "asc" | "desc";
export type TeamSort = { key: TeamSortKey; direction: SortDirection };

export const DEFAULT_TEAM_SORT: TeamSort = { key: "name", direction: "asc" };

/** Pressing the sorted button reverses it; another button starts ascending. */
export const nextTeamSort = (sort: TeamSort, key: TeamSortKey): TeamSort =>
  sort.key === key
    ? { key, direction: sort.direction === "asc" ? "desc" : "asc" }
    : { key, direction: "asc" };

const byName = (a: TeamSummaryRow, b: TeamSummaryRow) =>
  fullName(a.user).localeCompare(fullName(b.user));

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
) => {
  const sign = sort.direction === "asc" ? 1 : -1;

  const compareLogged = (a: TeamSummaryRow, b: TeamSummaryRow) => {
    if (byProject) return sign * (a.minutes - b.minutes);

    const shareA = loggedShare(a);
    const shareB = loggedShare(b);
    if (shareA === null || shareB === null) {
      return Number(shareA === null) - Number(shareB === null);
    }

    return sign * (shareA - shareB);
  };

  return [...rows].sort((a, b) =>
    sort.key === "name"
      ? sign * byName(a, b)
      : compareLogged(a, b) || byName(a, b),
  );
};

/** By name or position, ignoring case. */
export const searchTeamRows = (rows: TeamSummaryRow[], search: string) => {
  const query = search.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) =>
    [fullName(row.user), row.user.position ?? ""].some((text) =>
      text.toLowerCase().includes(query),
    ),
  );
};
