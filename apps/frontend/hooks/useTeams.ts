"use client";

import { useMemo } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { TeamsClientApi } from "@/lib/api/resources/teams";
import { AddTeamMemberPayload, UpdateTeamMemberPayload } from "@/types/Team";
import { queryKeys } from "./shared/queryKeys";
import { createEntityMutations } from "./shared/createEntityMutations";

const useTeamsMutations = createEntityMutations({
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

export const useTeams = () => {
  const teamsQuery = useInfiniteQuery({
    queryKey: queryKeys.teams.infinite(),

    queryFn: ({ pageParam }) => TeamsClientApi.getAll({ page: pageParam }),

    initialPageParam: 1,

    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.flatMap((page) => page.results).length;
      return loaded < lastPage.count ? pages.length + 1 : undefined;
    },
  });

  const items = useMemo(
    () => teamsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [teamsQuery.data],
  );

  const actions = useTeamsMutations();

  return {
    items,
    count: teamsQuery.data?.pages[0]?.count ?? 0,

    isLoading: teamsQuery.isLoading,
    isError: teamsQuery.isError,
    refetch: teamsQuery.refetch,

    actions,

    pagination: {
      fetchNextPage: teamsQuery.fetchNextPage,
      hasNextPage: teamsQuery.hasNextPage,
      isFetchingNextPage: teamsQuery.isFetchingNextPage,
    },
  };
};

export const useTeamMembers = (teamId: string) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });

  const addMember = useMutation({
    mutationFn: (data: AddTeamMemberPayload) =>
      TeamsClientApi.addMember(teamId, data),
    onSuccess: invalidate,
  });

  const updateMember = useMutation({
    mutationFn: ({
      membershipId,
      data,
    }: {
      membershipId: string;
      data: UpdateTeamMemberPayload;
    }) => TeamsClientApi.updateMember(teamId, membershipId, data),
    onSuccess: invalidate,
  });

  const removeMember = useMutation({
    mutationFn: (membershipId: string) =>
      TeamsClientApi.removeMember(teamId, membershipId),
    onSuccess: invalidate,
  });

  return { addMember, updateMember, removeMember };
};
