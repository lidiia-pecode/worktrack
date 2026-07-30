"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

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
  },

  messages: {
    create: "User created successfully",
    update: "User updated successfully",
    archive: "User deleted successfully",
  },
});

export const useUsers = () => {
  const usersQuery = useInfiniteQuery({
    queryKey: queryKeys.users.infinite(),

    queryFn: ({ pageParam = 1 }) => UsersClientApi.getAllPaginated(pageParam),

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
        .filter((u) => u.role === UserRole.MEMBER) ?? [],
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
