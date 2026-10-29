"use client";

import { useEffect, useState } from "react";
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

const PREVIEW_SETTLE_MS = 300;

/**
 * The value once it has stopped changing for a moment, compared by content;
 * the first one counts at once. `isSettling` is true while a newer one waits.
 */
function useSettledValue<T>(value: T) {
  const key = JSON.stringify(value);
  const [settled, setSettled] = useState({ key, value });

  useEffect(() => {
    if (settled.key === key) return;
    const timer = setTimeout(
      () => setSettled({ key, value }),
      PREVIEW_SETTLE_MS,
    );
    return () => clearTimeout(timer);
    // Keyed on content: a new object with the same content does not restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, settled.key]);

  return { value: settled.value, isSettling: settled.key !== key };
}

/**
 * What a period plan would do, from the server's own rules. Hours step
 * quickly through the picker, so the server is asked once they settle; the
 * previous answer stays on screen, marked outdated, while the next one loads.
 */
export function usePeriodPreview(payload: PlanPeriodPayload | null) {
  const { value: settled, isSettling } = useSettledValue(payload);

  const query = useQuery({
    enabled: settled !== null,
    queryKey: queryKeys.planning.preview(settled ?? {}),
    queryFn: () => PlanningClientApi.previewPeriod(settled!),
    placeholderData: keepPreviousData,
    retry: false,
  });

  return {
    preview: query.data,
    isOutdated: isSettling || query.isPlaceholderData || query.isFetching,
    error: query.error,
  };
}

/** A refusal is listed in the dialog; anything else is toasted as usual. */
export function usePlanPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PlanningClientApi.planPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.planning.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reporting.figures });
    },
    onError: (error) => {
      if (!isClientError(error)) toast.error(getErrorMessage(error));
    },
  });
}

/** Deletes one project's plans in a range at once; a failure is toasted. */
export function useDeletePeriodPlans() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: PlanningClientApi.deletePeriodPlans,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.planning.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reporting.figures });
      toast.success("Plan deleted");
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
  alsoInvalidate: [queryKeys.reporting.figures],

  api: {
    create: PlanningClientApi.create,
    update: PlanningClientApi.update,
    delete: PlanningClientApi.delete,
  },

  messages: {
    create: "Plan added",
    update: "Plan updated",
    delete: "Plan deleted",
  },
});
