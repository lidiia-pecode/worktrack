"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { PlannedVsActualQuery } from "@/types";
import { ReportingClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";

export function usePlannedVsActual(params: PlannedVsActualQuery) {
  const query = useQuery({
    queryKey: queryKeys.reporting.plannedVsActual({ ...params }),
    queryFn: () => ReportingClientApi.getPlannedVsActual(params),
    placeholderData: keepPreviousData,
  });

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    isPlaceholderData: query.isPlaceholderData,
    isError: query.isError,
    refetch: query.refetch,
  };
}
