import { useMemo } from "react";
import { toast } from "sonner";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { UpdateUserPayload } from "@/types";
import { UserRole } from "@/types/enums";
import { UsersClientApi } from "@/lib/api/resources";
import { queryKeys } from "./shared/queryKeys";

export const useUsers = () => {
  const queryClient = useQueryClient();

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
        .filter((u) => u.role === UserRole.USER) ?? [],
    [usersQuery.data],
  );

  const createUser = useMutation({
    mutationFn: UsersClientApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("User created successfully");
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
      UsersClientApi.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("User updated successfully");
    },
  });

  const deleteUser = useMutation({
    mutationFn: UsersClientApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("User deleted successfully");
    },
  });

  return {
    users,

    pagination: {
      fetchNextPage: usersQuery.fetchNextPage,
      hasNextPage: usersQuery.hasNextPage,
      isFetchingNextPage: usersQuery.isFetchingNextPage,
      isLoading: usersQuery.isLoading,
      isError: usersQuery.isError,
    },

    actions: {
      createUser,
      updateUser,
      deleteUser,
    },

    query: usersQuery,
  };
};
