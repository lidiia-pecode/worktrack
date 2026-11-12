"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useAllProjectsQuery } from "@/hooks/useProjects";
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
 * the URL. Defaults stay out of the address. The search and the sort are kept
 * here as set, the search as typed while the address holds it trimmed; the
 * address seeds them, since Next.js applies a history change to
 * `useSearchParams` a render later than the state, and resets them when it
 * changes from outside, such as the page's own sidebar link. A linked team
 * that isn't the viewer's, or a project that isn't listed, is dropped, as on
 * Reports.
 */
export const useTeamTimeFilters = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { readLinkedTeam } = useTeamChoice();

  const { teamId, isDropped } = readLinkedTeam(searchParams.get(TEAM_PARAM));

  // The same list the project filter shows, so it comes from the cache.
  const {
    items: projects,
    isLoading: isLoadingProjects,
    isError: isProjectsError,
  } = useAllProjectsQuery();
  const hasProjects = !isLoadingProjects && !isProjectsError;
  const projectInAddress = searchParams.get(PROJECT_PARAM);
  const isProjectDropped =
    projectInAddress !== null &&
    (!readIdParam(projectInAddress) ||
      (hasProjects &&
        !projects.some((project) => project.id === projectInAddress)));
  const projectId = isProjectDropped
    ? undefined
    : readIdParam(projectInAddress);

  const searchInAddress = searchParams.get(SEARCH_PARAM) ?? "";
  const sortParamInAddress = searchParams.get(SORT_PARAM);

  const [search, setSearchState] = useState(searchInAddress);
  const [sort, setSortState] = useState(() => readTeamSort(sortParamInAddress));
  // What this hook last put in the address, so its own writes arriving a
  // render late aren't taken for an outside change.
  const written = useRef({
    search: searchInAddress,
    sort: sortParamInAddress,
  });

  useEffect(() => {
    const isOwnWrite =
      searchInAddress === written.current.search &&
      sortParamInAddress === written.current.sort;
    if (isOwnWrite) return;

    written.current = { search: searchInAddress, sort: sortParamInAddress };
    setSearchState(searchInAddress);
    setSortState(readTeamSort(sortParamInAddress));
  }, [searchInAddress, sortParamInAddress]);

  const setFilters = (filters: TeamTimeFilters) => {
    const values = { teamId, projectId, search, sort, ...filters };
    const searchParam = values.search?.trim() || undefined;
    const sortParam = teamSortParam(values.sort);

    written.current = { search: searchParam ?? "", sort: sortParam ?? null };
    replaceParams(pathname, [
      [TEAM_PARAM, values.teamId],
      [PROJECT_PARAM, values.projectId],
      [SEARCH_PARAM, searchParam],
      [SORT_PARAM, sortParam],
    ]);
  };

  useEffect(() => {
    const dropped = [
      isDropped && TEAM_PARAM,
      isProjectDropped && PROJECT_PARAM,
    ].filter((name): name is string => Boolean(name));

    if (dropped.length > 0) {
      replaceParams(
        pathname,
        dropped.map((name) => [name, undefined]),
      );
    }
  }, [isDropped, isProjectDropped, pathname]);

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
