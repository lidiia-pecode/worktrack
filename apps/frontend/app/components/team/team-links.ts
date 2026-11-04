/** The person Team time highlights, from a link such as Reports'. */
export const PERSON_PARAM = "person";

/** Team time on the week of `week` (any day of it; this week without one), with a person's row highlighted. */
export const teamTimeHref = (personId: string, week?: string) => {
  const params = new URLSearchParams({ [PERSON_PARAM]: personId });
  if (week) params.set("week", week);
  return `/team?${params}`;
};

/** The week grids' filters, kept in the URL so a reload returns to them. */
export const TEAM_PARAM = "team";
export const PROJECT_PARAM = "project";
export const SEARCH_PARAM = "search";
export const SORT_PARAM = "sort";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * An id from the address, or none for anything that isn't one: a mistyped
 * link would otherwise be refused by the API, leaving the page on an error
 * with no filter to clear.
 */
export const readIdParam = (value: string | null) =>
  value && UUID.test(value) ? value : undefined;
