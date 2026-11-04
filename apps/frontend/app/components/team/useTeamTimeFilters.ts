"use client";

import { useState } from "react";
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
 * The search and the sort are kept here as set, the search as typed while the
 * address holds it trimmed; the address only seeds them, since Next.js applies
 * a history change to `useSearchParams` a render later than the state.
 */
export const useTeamTimeFilters = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const teamId = readIdParam(searchParams.get(TEAM_PARAM));
  const projectId = readIdParam(searchParams.get(PROJECT_PARAM));
  const searchInAddress = searchParams.get(SEARCH_PARAM) ?? "";
  const sortInAddress = readTeamSort(searchParams.get(SORT_PARAM));

  const [search, setSearchState] = useState(searchInAddress);
  const [sort, setSortState] = useState(sortInAddress);

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
