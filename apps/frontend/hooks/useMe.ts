"use client";

import { useQuery } from "@tanstack/react-query";

import { User } from "@/types/User";
import { AuthClient } from "@/lib/api/resources";
import { queryKeys } from "./shared/queryKeys";

export function useMe({ enabled = true } = {}) {
  return useQuery<User>({
    queryKey: queryKeys.auth.me(),
    queryFn: () => AuthClient.me(),
    retry: false,
    staleTime: 1000 * 55,
    throwOnError: false,
    enabled,
  });
}
