"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { readTeamSort, TeamSort, teamSortParam } from "@/lib/utils/team-rows";

import {
  PROJECT_PARAM,
  readIdParam,
  SEARCH_PARAM,
  SORT_PARAM,
  TEAM_PARAM,
} from "./team-links";

type TeamTimeFilters = {
  teamId?: string;
  projectId?: string;
  search?: string;
  sort?: TeamSort;
};

/**
 * The week grids' team, project, search and sort, read from and written to
 * the URL; Planning uses the first three. Defaults stay out of the address.
 */
export const useTeamTimeFilters = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const teamId = readIdParam(searchParams.get(TEAM_PARAM));
  const projectId = readIdParam(searchParams.get(PROJECT_PARAM));
  const search = searchParams.get(SEARCH_PARAM) ?? "";
  const sort = readTeamSort(searchParams.get(SORT_PARAM));

  // Through the history API, so the page isn't rendered again from the server;
  // the week and the highlighted person stay.
  const setFilters = (filters: TeamTimeFilters) => {
    const params = new URLSearchParams(window.location.search);
    const values = { teamId, projectId, search, sort, ...filters };
    const written: [string, string | undefined][] = [
      [TEAM_PARAM, values.teamId],
      [PROJECT_PARAM, values.projectId],
      [SEARCH_PARAM, values.search?.trim() || undefined],
      [SORT_PARAM, teamSortParam(values.sort)],
    ];

    written.forEach(([name, value]) => {
      if (value) params.set(name, value);
      else params.delete(name);
    });

    window.history.replaceState(
      null,
      "",
      params.size ? `${pathname}?${params}` : pathname,
    );
  };

  return { teamId, projectId, search, sort, setFilters };
};
