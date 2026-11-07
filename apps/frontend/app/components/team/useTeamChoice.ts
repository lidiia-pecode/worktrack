"use client";

import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamOptions } from "@/hooks/useTeams";
import { UserRole } from "@/types/enums";

import { readIdParam } from "./team-links";

/**
 * The teams Team time, Planning and Reports offer, and whether they offer a
 * choice: the owner always picks (all teams or one), anyone else once they see
 * more than one. It follows the teams the API returns, not the role, so wider
 * access later needs no change here.
 */
export const useTeamChoice = () => {
  const { user } = useAuth();
  const { options, isLoading, isError } = useTeamOptions();

  /**
   * The team a link's `?team=` names, if it is one of the viewer's. Anything
   * else, a mistyped id included, is to be dropped from the address once their
   * teams have loaded, rather than showing an error or lingering there.
   */
  const readLinkedTeam = (param: string | null) => {
    const linked = readIdParam(param);
    const isKnown = options.some((team) => team.value === linked);
    // Only against a loaded list: a failed one would drop every link.
    const isDropped = param !== null && !isLoading && !isError && !isKnown;

    return { teamId: isDropped ? undefined : linked, isDropped };
  };

  return {
    options,
    isLoading,
    isError,
    // Only once the teams have loaded, so the server and the browser's first
    // pass render the same.
    choosesTeam:
      !isLoading && (user?.role === UserRole.OWNER || options.length > 1),
    readLinkedTeam,
  };
};
