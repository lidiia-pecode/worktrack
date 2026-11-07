"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { readTeamSort, TeamSort, teamSortParam } from "@/lib/utils/team-rows";

import {
  PROJECT_PARAM,
  readIdParam,
  SEARCH_PARAM,
  SORT_PARAM,
  TEAM_PARAM,
} from "./team-links";
import { useTeamChoice } from "./useTeamChoice";

// Through the history API, so the page isn't rendered again from the server;
// the week and the highlighted person stay.
const replaceParams = (
  pathname: string,
  entries: [string, string | undefined][],
) => {
  const params = new URLSearchParams(window.location.search);
  entries.forEach(([name, value]) => {
    if (value) params.set(name, value);
    else params.delete(name);
  });

  window.history.replaceState(
    null,
    "",
    params.size ? `${pathname}?${params}` : pathname,
  );
};

type TeamTimeFilters = {
  teamId?: string;
  projectId?: string;
  search?: string;
  sort?: TeamSort;
};

/**
 * The week grids' team, project, search and sort, read from and written to
 * the URL; Planning uses the first three. Defaults stay out of the address.
 * The search and the sort are kept here as set, the search as typed while the
 * address holds it trimmed; the address only seeds them, since Next.js applies
 * a history change to `useSearchParams` a render later than the state. A
 * linked team that isn't the viewer's is dropped, as on Reports.
 */
export const useTeamTimeFilters = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { readLinkedTeam } = useTeamChoice();

  const { teamId, isDropped } = readLinkedTeam(searchParams.get(TEAM_PARAM));
  const projectId = readIdParam(searchParams.get(PROJECT_PARAM));
  const searchInAddress = searchParams.get(SEARCH_PARAM) ?? "";
  const sortInAddress = readTeamSort(searchParams.get(SORT_PARAM));

  const [search, setSearchState] = useState(searchInAddress);
  const [sort, setSortState] = useState(sortInAddress);

  const setFilters = (filters: TeamTimeFilters) => {
    const values = { teamId, projectId, search, sort, ...filters };
    replaceParams(pathname, [
      [TEAM_PARAM, values.teamId],
      [PROJECT_PARAM, values.projectId],
      [SEARCH_PARAM, values.search?.trim() || undefined],
      [SORT_PARAM, teamSortParam(values.sort)],
    ]);
  };

  useEffect(() => {
    if (isDropped) replaceParams(pathname, [[TEAM_PARAM, undefined]]);
  }, [isDropped, pathname]);

  const setSearch = (value: string) => {
    setSearchState(value);
    setFilters({ search: value });
  };

  const setSort = (value: TeamSort) => {
    setSortState(value);
    setFilters({ sort: value });
  };

  const clearFilters = () => {
    setSearchState("");
    setFilters({ teamId: undefined, projectId: undefined, search: "" });
  };

  return {
    teamId,
    projectId,
    search,
    sort,
    setFilters,
    setSearch,
    setSort,
    clearFilters,
  };
};
