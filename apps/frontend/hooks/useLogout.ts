"use client";

import { useMutation } from "@tanstack/react-query";
import { AuthClient } from "@/app/api/auth/auth.client";

export function useLogout() {
  const mutation = useMutation({
    mutationFn: AuthClient.logout,
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  return {
    logout: mutation.mutate,
    logoutAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
