"use client";

import { useQuery } from "@tanstack/react-query";

import {
  AssignableUser,
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UsersQuery,
} from "@/types";

import { UsersClientApi } from "@/lib/api/resources";

import { createEntityMutations } from "./shared/createEntityMutations";
import { createEntityQuery } from "./shared/createEntityQuery";
import { queryKeys } from "./shared/queryKeys";

type UserQueryParams = Omit<UsersQuery, "page">;

const usersQueries = createEntityQuery<User, UserQueryParams>({
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
  UserQueryParams
>({
  queryKey: queryKeys.users.assignable,

  api: {
    getAll: UsersClientApi.getAssignable,
  },
});

export const useAssignableUsersInfiniteQuery =
  assignableUsersQueries.useInfiniteQuery;

export const useUsersMutations = createEntityMutations<
  User,
  CreateUserPayload,
  UpdateUserPayload,
  User,
  User
>({
  queryKey: queryKeys.users.all,

  api: {
    create: UsersClientApi.create,
    update: UsersClientApi.update,
    archive: UsersClientApi.archive,
    unarchive: UsersClientApi.unarchive,
  },

  messages: {
    create: "User created successfully",
    update: "User updated successfully",
    archive: "User deleted successfully",
    unarchive: "User restored successfully",
  },
});

export const useUserDetails = (id: string) =>
  useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => UsersClientApi.getById(id),
    enabled: Boolean(id),
  });
