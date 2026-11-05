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
    refetch: query.refetch,
  };
}

/** Working hours feed Expected, Planning's limits and the Manage list's weekly hours. */
const useRefreshAfterCapacityChange = () => {
  const queryClient = useQueryClient();

  return () =>
    [
      queryKeys.capacity.all,
      queryKeys.timelogs.all,
      queryKeys.planning.all,
      queryKeys.reporting.figures,
      queryKeys.users.all,
    ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
};

export function useSetCapacity() {
  const refresh = useRefreshAfterCapacityChange();

  return useMutation({
    mutationFn: (data: SetCapacityPayload) =>
      CapacityClientApi.setForUser(data),

    onSuccess: () => {
      refresh();
      toast.success("Working hours updated");
    },
  });
}

export function useCancelCapacityChange() {
  const refresh = useRefreshAfterCapacityChange();

  return useMutation({
    mutationFn: ({
      userId,
      validFrom,
    }: {
      userId: string;
      validFrom: string;
    }) => CapacityClientApi.cancelChange(userId, validFrom),

    onSuccess: () => {
      refresh();
      toast.success("Working hours change cancelled");
    },
  });
}
