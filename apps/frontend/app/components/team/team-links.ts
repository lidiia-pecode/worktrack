/** The person Team time highlights, from a link such as Reports'. */
export const PERSON_PARAM = "person";

/** Team time on the week of `week` (any day of it; this week without one), with a person's row highlighted. */
export const teamTimeHref = (personId: string, week?: string) => {
  const params = new URLSearchParams({ [PERSON_PARAM]: personId });
  if (week) params.set("week", week);
  return `/team?${params}`;
};
