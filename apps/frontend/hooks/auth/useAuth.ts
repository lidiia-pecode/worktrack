"use client";

import { useQuery } from "@tanstack/react-query";
import { AuthClient } from "@/lib/api/resources";
import { User } from "@/types";
import { queryKeys } from "../shared/queryKeys";

export function useAuth() {
  const me = useQuery<User>({
    queryKey: queryKeys.auth.me(),
    queryFn: AuthClient.me,
    retry: false,
    staleTime: 1000 * 55,
    throwOnError: false,
  });

  return {
    user: me.data ?? null,

    query: {
      ...me,
      isLoading: me.isLoading,
      isFetching: me.isFetching,
      isError: me.isError,
      error: me.error ?? null,
      refetch: me.refetch,
    },
  };
}
