"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  CreatePlanningEntryPayload,
  PlanPeriodPayload,
  PlanningEntry,
  PlanningQuery,
  PlanningWeekQuery,
  UpdatePlanningEntryPayload,
} from "@/types";
import { PlanningClientApi } from "@/lib/api/resources";
import { getErrorMessage, isClientError } from "@/lib/api";

import { createEntityMutations } from "./shared/createEntityMutations";
import { fetchAllPages } from "./shared/fetchAllPages";
import { queryKeys } from "./shared/queryKeys";

/** Keeps the previous week on screen while the next one loads. */
export function usePlanningWeek(params: PlanningWeekQuery) {
  const query = useQuery({
    queryKey: queryKeys.planning.week(params),
    queryFn: () => PlanningClientApi.getWeek(params),
    placeholderData: keepPreviousData,
  });

  return {
    week: query.data ?? null,
    rows: query.data?.rows ?? [],
    isLoading: query.isLoading,
    isPlaceholderData: query.isPlaceholderData,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function usePlanningEntries(
  params: PlanningQuery,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const query = useQuery({
    enabled,
    queryKey: queryKeys.planning.list({ ...params }),
    queryFn: () =>
      fetchAllPages((page, pageSize) =>
        PlanningClientApi.getAll({ ...params, page, pageSize }),
      ),
    placeholderData: keepPreviousData,
  });

  return {
    items: query.data?.results ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/**
 * What a period plan would do, from the server's own rules. The previous
 * answer stays on screen, marked outdated, while the next one loads.
 */
export function usePeriodPreview(payload: PlanPeriodPayload | null) {
  const query = useQuery({
    enabled: payload !== null,
    queryKey: queryKeys.planning.preview(payload ?? {}),
    queryFn: () => PlanningClientApi.previewPeriod(payload!),
    placeholderData: keepPreviousData,
    retry: false,
  });

  return {
    preview: query.data,
    isOutdated: query.isPlaceholderData || query.isFetching,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** A refusal is listed in the dialog; anything else is toasted as usual. */
export function usePlanPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PlanningClientApi.planPeriod,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.planning.all }),
    onError: (error) => {
      if (!isClientError(error)) toast.error(getErrorMessage(error));
    },
  });
}

export const usePlanningMutations = createEntityMutations<
  PlanningEntry,
  CreatePlanningEntryPayload,
  UpdatePlanningEntryPayload,
  unknown
>({
  queryKey: queryKeys.planning.all,

  api: {
    create: PlanningClientApi.create,
    update: PlanningClientApi.update,
    delete: PlanningClientApi.delete,
  },

  messages: {
    create: "Plan added",
    update: "Plan updated",
    delete: "Plan removed",
  },
});
