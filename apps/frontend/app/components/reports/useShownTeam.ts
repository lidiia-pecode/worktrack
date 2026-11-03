"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { useTeamOptions } from "@/hooks/useTeams";

import { readIdParam, TEAM_PARAM } from "../team/team-links";

/**
 * The one team Reports shows, kept in `?team=`. A linked team outside the ones
 * the caller can choose is dropped once they've loaded, rather than showing
 * an empty report.
 */
export const useShownTeam = (isOwner: boolean) => {
  const searchParams = useSearchParams();
  // Every active team for an owner, the ones they lead for a manager.
  const { options, isLoading } = useTeamOptions();

  const linked = readIdParam(searchParams.get(TEAM_PARAM));
  const isUnknown =
    !isLoading &&
    Boolean(linked) &&
    !options.some((team) => team.value === linked);
  const teamId = isUnknown ? undefined : linked;

  const showTeam = useCallback((nextTeamId?: string) => {
    const url = new URL(window.location.href);
    if (nextTeamId) url.searchParams.set(TEAM_PARAM, nextTeamId);
    else url.searchParams.delete(TEAM_PARAM);
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (isUnknown) showTeam(undefined);
  }, [isUnknown, showTeam]);

  return {
    teamId,
    teamName: options.find((team) => team.value === teamId)?.label,
    teamOptions: options,
    // For an owner, and a manager who leads more than one team (decision 7).
    // Only once the teams have loaded, so the server and the browser's first
    // pass render the same.
    choosesTeam: !isLoading && (isOwner || options.length > 1),
    showTeam,
  };
};
