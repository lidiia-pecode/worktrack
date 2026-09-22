"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  CreatePlanningEntryPayload,
  PlanningEntry,
  PlanningWeekQuery,
  UpdatePlanningEntryPayload,
} from "@/types";
import { PlanningClientApi } from "@/lib/api/resources";

import { createEntityMutations } from "./shared/createEntityMutations";
import { queryKeys } from "./shared/queryKeys";

/**
 * One week of the planning grid. Keeps the previous week on screen while the
 * next one loads, like the team view.
 */
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
