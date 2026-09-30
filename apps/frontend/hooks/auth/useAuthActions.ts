"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthClient } from "@/lib/api/resources";
import { queryKeys } from "../shared/queryKeys";

export function useAuthActions() {
  const queryClient = useQueryClient();

  // Sign-in and sign-up replace the global toast: AuthForm shows the error.
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

    // Replaces the global toast: the Google sign-up page shows the error itself.
    onError: () => {},
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
