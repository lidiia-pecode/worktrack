"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthClient } from "@/lib/api/resources";
import { User } from "@/types";
import { queryKeys } from "./shared/queryKeys";

export function useAuth() {
  const queryClient = useQueryClient();

  const me = useQuery<User>({
    queryKey: queryKeys.auth.me(),
    queryFn: AuthClient.me,
    retry: false,
    staleTime: 1000 * 55,
    throwOnError: false,
  });

  const login = useMutation({
    mutationFn: AuthClient.login,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.me(),
      });
    },
  });

  const signup = useMutation({
    mutationFn: AuthClient.signup,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.me(),
      });
    },
  });

  const completeGoogleSignup = useMutation({
    mutationFn: AuthClient.completeGoogleSignup,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.me(),
      });
    },
  });

  const logout = useMutation({
    mutationFn: AuthClient.logout,

    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: queryKeys.auth.me(),
      });
    },
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

    actions: {
      login,
      signup,
      completeGoogleSignup,
      logout,
    },
  };
}
