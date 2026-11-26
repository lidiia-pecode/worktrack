"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { AuthClient } from "@/lib/api/resources";
import { CurrentUser } from "@/types";
import { queryKeys } from "../shared/queryKeys";

export function useAuth() {
  const me = useQuery<CurrentUser>({
    queryKey: queryKeys.auth.me(),
    queryFn: AuthClient.me,
    retry: false,
    staleTime: 1000 * 55,
    throwOnError: false,
  });

  return { user: me.data ?? null };
}

/**
 * The sidebar is drawn on the server from the signed-in person, and their own
 * pages show only while they have time to log; a change to their own working
 * hours or projects redraws it.
 */
export function useRefreshOwnMenu() {
  const router = useRouter();
  const { user } = useAuth();

  return (changedUserId: string) => {
    if (changedUserId === user?.id) router.refresh();
  };
}
