"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthClient } from "@/lib/api/resources";
import { queryKeys } from "../shared/queryKeys";

export function useAuthActions() {
  const queryClient = useQueryClient();

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

  const completeGoogleLink = useMutation({
    mutationFn: AuthClient.completeGoogleLink,

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
    login,
    signup,
    completeGoogleSignup,
    completeGoogleLink,
    logout,
  };
}
