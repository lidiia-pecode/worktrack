"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SetCapacityPayload } from "@/types";
import { CapacityClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";

export function useUserCapacity(userId: string, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.capacity.forUser(userId),
    queryFn: () => CapacityClientApi.getForUser(userId),
    enabled,
  });

  return {
    capacity: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useSetCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SetCapacityPayload) =>
      CapacityClientApi.setForUser(data),

    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.capacity.forUser(variables.userId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.capacity.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timelogs.all });

      toast.success("Working hours updated");
    },
  });
}
