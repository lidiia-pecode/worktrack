"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AssignableUser,
  AssignableUsersQuery,
  UpdateUserPayload,
  User,
  UserListItem,
  UsersQuery,
} from "@/types";

import { UsersClientApi } from "@/lib/api/resources";

import { createEntityMutations } from "./shared/createEntityMutations";
import { createEntityQuery } from "./shared/createEntityQuery";
import { queryKeys } from "./shared/queryKeys";

type UserQueryParams = Omit<UsersQuery, "page">;

const usersQueries = createEntityQuery<UserListItem, UserQueryParams>({
  queryKey: queryKeys.users,

  api: {
    getAll: UsersClientApi.getAll,
  },
});

export const useUsersQuery = usersQueries.useQuery;

export const useUsersInfiniteQuery = usersQueries.useInfiniteQuery;

/**
 * Who may be added to a team or project. A separate list from the one above:
 * that one narrows to a manager's own people, and staffing has to reach past
 * them.
 */
const assignableUsersQueries = createEntityQuery<
  AssignableUser,
  Omit<AssignableUsersQuery, "page">
>({
  queryKey: queryKeys.users.assignable,

  api: {
    getAll: UsersClientApi.getAssignable,
  },
});

export const useAssignableUsersInfiniteQuery =
  assignableUsersQueries.useInfiniteQuery;

export const useAssignableUsersAllPagesQuery =
  assignableUsersQueries.useAllPagesQuery;

export const useUsersMutations = createEntityMutations<
  User,
  never,
  UpdateUserPayload,
  User,
  User
>({
  queryKey: queryKeys.users.all,

  // Team member rows show each person's company role.
  alsoInvalidate: [queryKeys.teams.all],

  api: {
    update: UsersClientApi.update,
  },

  messages: {
    update: "User updated successfully",
  },
});

/**
 * Leaving and coming back change what is expected of someone, and leaving
 * deletes what was recorded after the last working day, so every view of
 * time, plans, absences and figures reads again.
 */
const CHANGED_BY_LEAVING = [
  queryKeys.users.all,
  queryKeys.teams.all,
  queryKeys.timelogs.all,
  queryKeys.planning.all,
  queryKeys.absences.all,
  queryKeys.capacity.all,
  queryKeys.reporting.figures,
];

export const useUserStatusMutations = () => {
  const queryClient = useQueryClient();
  const refresh = () =>
    CHANGED_BY_LEAVING.forEach((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    );

  const deactivate = useMutation({
    mutationFn: ({
      id,
      lastWorkingDay,
    }: {
      id: string;
      lastWorkingDay: string;
    }) => UsersClientApi.deactivate(id, lastWorkingDay),
    onSuccess: () => {
      refresh();
      toast.success("User deactivated successfully");
    },
  });

  const reactivate = useMutation({
    mutationFn: ({ id, firstDayBack }: { id: string; firstDayBack: string }) =>
      UsersClientApi.reactivate(id, firstDayBack),
    onSuccess: () => {
      refresh();
      toast.success("User reactivated successfully");
    },
  });

  return { deactivate, reactivate };
};

/** What deactivating someone with this last working day would delete. */
export const useDeactivationImpact = (id: string, lastWorkingDay: string) =>
  useQuery({
    queryKey: [
      ...queryKeys.users.detail(id),
      "deactivation-impact",
      lastWorkingDay,
    ],
    queryFn: () => UsersClientApi.getDeactivationImpact(id, lastWorkingDay),
    enabled: Boolean(id && lastWorkingDay),
  });

export const useUserDetails = (id: string) =>
  useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => UsersClientApi.getById(id),
    enabled: Boolean(id),
  });
