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

    onError: () => {},
  });

  const signup = useMutation({
    mutationFn: AuthClient.signup,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.me(),
      });
    },

    onError: () => {},
  });

  const completeGoogleSignup = useMutation({
    mutationFn: AuthClient.completeGoogleSignup,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.me(),
      });
    },

    onError: () => {},
  });

  const completeGoogleLink = useMutation({
    mutationFn: AuthClient.completeGoogleLink,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.auth.me(),
      });
    },

    onError: () => {},
  });

  const logout = useMutation({
    mutationFn: AuthClient.logout,

    onSuccess: () => {
      queryClient.removeQueries();
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
