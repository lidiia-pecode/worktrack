"use client";

import { useMutation } from "@tanstack/react-query";
import { AuthClient } from "@/lib/api/resources";

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
