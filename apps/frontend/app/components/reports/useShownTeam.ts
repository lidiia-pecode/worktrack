"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { readIdParam, TEAM_PARAM } from "../team/team-links";

/**
 * The one team Reports shows, kept in `?team=` as Team time keeps its filter.
 * Until the teams the caller can choose have loaded, a linked team counts;
 * once they have, one outside them (a manager's link to a team they don't
 * lead) is dropped, address included, rather than showing an empty report.
 */
export const useShownTeam = (teamIds: string[] | undefined) => {
  const searchParams = useSearchParams();
  const linked = readIdParam(searchParams.get(TEAM_PARAM));
  const isUnknown = Boolean(linked && teamIds && !teamIds.includes(linked));

  // Through the history API, as the period and the panels are kept.
  const showTeam = useCallback((teamId?: string) => {
    const url = new URL(window.location.href);
    if (teamId) url.searchParams.set(TEAM_PARAM, teamId);
    else url.searchParams.delete(TEAM_PARAM);
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (isUnknown) showTeam(undefined);
  }, [isUnknown, showTeam]);

  return { teamId: isUnknown ? undefined : linked, showTeam };
};
