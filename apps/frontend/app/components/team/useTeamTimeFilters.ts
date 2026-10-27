"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { PROJECT_PARAM, TEAM_PARAM } from "./team-links";

type TeamTimeFilters = { teamId?: string; projectId?: string };

/** Team time's team and project, read from and written to the URL. */
export const useTeamTimeFilters = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const teamId = searchParams.get(TEAM_PARAM) ?? undefined;
  const projectId = searchParams.get(PROJECT_PARAM) ?? undefined;

  // Through the history API, so the page isn't rendered again from the server;
  // the week and the highlighted person stay.
  const setFilters = (filters: TeamTimeFilters) => {
    const params = new URLSearchParams(window.location.search);
    const values = { teamId, projectId, ...filters };

    if (values.teamId) params.set(TEAM_PARAM, values.teamId);
    else params.delete(TEAM_PARAM);
    if (values.projectId) params.set(PROJECT_PARAM, values.projectId);
    else params.delete(PROJECT_PARAM);

    window.history.replaceState(
      null,
      "",
      params.size ? `${pathname}?${params}` : pathname,
    );
  };

  return { teamId, projectId, setFilters };
};
