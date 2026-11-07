"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { TEAM_PARAM } from "../team/team-links";
import { useTeamChoice } from "../team/useTeamChoice";

/**
 * The one team Reports shows, kept in `?team=`. A linked team that isn't the
 * caller's is dropped from the address once their teams have loaded.
 */
export const useShownTeam = () => {
  const searchParams = useSearchParams();
  const { options, choosesTeam, readLinkedTeam } = useTeamChoice();

  const { teamId, isDropped } = readLinkedTeam(searchParams.get(TEAM_PARAM));

  const showTeam = useCallback((nextTeamId?: string) => {
    const url = new URL(window.location.href);
    if (nextTeamId) url.searchParams.set(TEAM_PARAM, nextTeamId);
    else url.searchParams.delete(TEAM_PARAM);
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (isDropped) showTeam(undefined);
  }, [isDropped, showTeam]);

  return {
    teamId,
    teamName: options.find((team) => team.value === teamId)?.label,
    teamOptions: options,
    choosesTeam,
    showTeam,
  };
};
