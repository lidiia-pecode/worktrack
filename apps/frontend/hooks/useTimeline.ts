"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ReportRange } from "@/types";
import { ReportingClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";

/** The month's hours week by week. */
export function useTimeline(params: ReportRange) {
  const query = useQuery({
    queryKey: queryKeys.reporting.timeline({ ...params }),
    queryFn: () => ReportingClientApi.getTimeline(params),
    placeholderData: keepPreviousData,
  });

  return {
    timeline: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isPlaceholderData: query.isPlaceholderData,
    refetch: query.refetch,
  };
}
