"use client";

import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { UserRole } from "@/types/enums";
import { UsersClientApi } from "@/lib/api/resources";
import { queryKeys } from "./shared/queryKeys";
import { createEntityMutations } from "./shared/createEntityMutations";

const useUsersMutations = createEntityMutations({
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

export const useUsers = () => {
  const usersQuery = useInfiniteQuery({
    queryKey: queryKeys.users.infinite(),

    queryFn: ({ pageParam }) => UsersClientApi.getAll({ page: pageParam }),

    initialPageParam: 1,

    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.flatMap((p) => p.results).length;
      return loaded < lastPage.count ? pages.length + 1 : undefined;
    },
  });

  const users = useMemo(
    () =>
      usersQuery.data?.pages
        .flatMap((p) => p.results)
        .filter((u) => u.role === UserRole.EMPLOYEE) ?? [],
    [usersQuery.data],
  );

  const actions = useUsersMutations();

  return {
    items: users,
    count: usersQuery.data?.pages[0]?.count ?? 0,
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    refetch: usersQuery.refetch,
    actions,

    // Keep pagination for drawer usage in project modals
    pagination: {
      fetchNextPage: usersQuery.fetchNextPage,
      hasNextPage: usersQuery.hasNextPage,
      isFetchingNextPage: usersQuery.isFetchingNextPage,
    },
  };
};

export const useUserDetails = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => UsersClientApi.getById(id),
    enabled: Boolean(id),
  });
};
