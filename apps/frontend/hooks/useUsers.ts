import { UsersClientApi } from "@/app/api/users/users.client";
import { UpdateUserPayload } from "@/types";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

export const useUsers = () => {
  const queryClient = useQueryClient();

  // ─────────────────────────────────────────────
  // 📦 USERS (INFINITE QUERY)
  // ─────────────────────────────────────────────
  const usersQuery = useInfiniteQuery({
    queryKey: ["users"],

    queryFn: ({ pageParam = 1 }) => UsersClientApi.getAllPaginated(pageParam),

    initialPageParam: 1,

    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.flatMap((p) => p.results).length;
      return loaded < lastPage.count ? pages.length + 1 : undefined;
    },
  });

  const users = useMemo(
    () => usersQuery.data?.pages.flatMap((p) => p.results) ?? [],
    [usersQuery.data],
  );

  // ─────────────────────────────────────────────
  // ⚡ MUTATIONS
  // ─────────────────────────────────────────────
  const createUser = useMutation({
    mutationFn: UsersClientApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
      UsersClientApi.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated successfully");
    },
  });

  const deleteUser = useMutation({
    mutationFn: UsersClientApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
  });

  // ─────────────────────────────────────────────
  // 🧠 CLEAN PUBLIC API (ОЦЕ ГОЛОВНЕ)
  // ─────────────────────────────────────────────
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

    // (optional debug escape hatch)
    query: usersQuery,
  };
};
