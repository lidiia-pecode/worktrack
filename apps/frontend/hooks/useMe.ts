"use client";

import { useQuery } from "@tanstack/react-query";
import { AuthClient } from "@/app/api/auth/auth.client";
import { User } from "@/types/User";

export function useMe({ enabled = true } = {}) {
  return useQuery<User>({
    queryKey: ["me"],
    queryFn: () => AuthClient.me(),
    retry: false,
    staleTime: 1000 * 55,
    throwOnError: false,
    enabled,
  });
}
