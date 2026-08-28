"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { TeamsClientApi } from "@/lib/api/resources/teams.api";

import {
  AddTeamMemberPayload,
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

const useTeamsMutations = createEntityMutations<
  Team,
  CreateTeamPayload,
  UpdateTeamPayload,
  Team,
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
    archive: "Team archived successfully!",
    unarchive: "Team restored successfully!",
  },
});

export function useTeams(page = 1, params?: TeamQueryParams) {
  const query = useTeamsQuery(page, params);

  const actions = useTeamsMutations();

  return {
    ...query,
    actions,
  };
}

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
