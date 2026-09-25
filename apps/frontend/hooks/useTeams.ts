"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { TeamsClientApi } from "@/lib/api/resources/teams.api";
import { TeamStatus } from "@/types/enums";

import {
  AddTeamMemberPayload,
  ArchivedTeam,
  CreateTeamPayload,
  Team,
  TeamsQuery,
  UpdateTeamMemberPayload,
  UpdateTeamPayload,
} from "@/types/Team";

import { createEntityMutations } from "./shared/createEntityMutations";
import { createEntityQuery } from "./shared/createEntityQuery";
import { queryKeys } from "./shared/queryKeys";

type TeamQueryParams = Omit<TeamsQuery, "page">;

const teamsQueries = createEntityQuery<Team, TeamQueryParams>({
  queryKey: queryKeys.teams,

  api: {
    getAll: TeamsClientApi.getAll,
  },
});

export const useTeamsQuery = teamsQueries.useQuery;

export const useTeamsInfiniteQuery = teamsQueries.useInfiniteQuery;

/**
 * Active teams as select options. `GET /teams` is already narrowed to the teams
 * a manager leads, so a manager only ever sees their own.
 */
export function useTeamOptions() {
  const { items, isLoading } = teamsQueries.useAllPagesQuery({
    status: TeamStatus.ACTIVE,
  });

  const options = useMemo(
    () => items.map((team) => ({ value: team.id, label: team.name })),
    [items],
  );

  return { options, isLoading };
}

/**
 * Whether the caller can see an archived team. For a manager with no active
 * team, this tells "leads nothing" apart from "every team they lead is archived".
 */
export function useHasArchivedTeams() {
  const { items, isLoading } = useTeamsQuery(1, {
    status: TeamStatus.ARCHIVED,
    pageSize: 1,
  });

  return { hasArchivedTeams: items.length > 0, isLoading };
}

export const useTeamsMutations = createEntityMutations<
  Team,
  CreateTeamPayload,
  UpdateTeamPayload,
  ArchivedTeam,
  Team
>({
  queryKey: queryKeys.teams.all,

  api: {
    create: TeamsClientApi.create,
    update: TeamsClientApi.update,
    archive: TeamsClientApi.archive,
    unarchive: TeamsClientApi.unarchive,
  },

  messages: {
    create: "Team created successfully!",
    update: "Team updated successfully!",
    archive: ({ revokedInvitationCount }) =>
      revokedInvitationCount === 0
        ? "Team archived successfully!"
        : `Team archived. Pending invitations revoked: ${revokedInvitationCount}.`,
    unarchive: "Team restored successfully!",
  },
});

export function useTeamMembers(teamId: string) {
  const queryClient = useQueryClient();

  const invalidateTeams = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.teams.all,
    });

  const addMember = useMutation({
    mutationFn: (data: AddTeamMemberPayload) =>
      TeamsClientApi.addMember(teamId, data),

    onSuccess: invalidateTeams,
  });

  const updateMember = useMutation({
    mutationFn: ({
      membershipId,
      data,
    }: {
      membershipId: string;
      data: UpdateTeamMemberPayload;
    }) => TeamsClientApi.updateMember(teamId, membershipId, data),

    onSuccess: invalidateTeams,
  });

  const removeMember = useMutation({
    mutationFn: (membershipId: string) =>
      TeamsClientApi.removeMember(teamId, membershipId),

    onSuccess: invalidateTeams,
  });

  return {
    addMember,
    updateMember,
    removeMember,
  };
}
