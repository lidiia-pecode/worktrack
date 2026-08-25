"use client";

import { useQuery } from "@tanstack/react-query";

import { UsersClientApi } from "@/lib/api/resources";
import { queryKeys } from "./shared/queryKeys";
import { createEntityMutations } from "./shared/createEntityMutations";
import { createEntityQuery } from "./shared/createEntityQuery";
import { CreateUserPayload, UpdateUserPayload, User } from "@/types";

const usersQueries = createEntityQuery<User>({
  queryKey: queryKeys.users,

  api: {
    getAll: UsersClientApi.getAll,
  },
});

export const useUsersQuery = usersQueries.useQuery;
export const useUsersInfiniteQuery = usersQueries.useInfiniteQuery;

const useUsersMutations = createEntityMutations<
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

export function useUsers(page = 1) {
  const query = useUsersQuery(page);
  const actions = useUsersMutations();

  return {
    ...query,
    actions,
  };
}

export const useUserDetails = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => UsersClientApi.getById(id),
    enabled: Boolean(id),
  });
};
