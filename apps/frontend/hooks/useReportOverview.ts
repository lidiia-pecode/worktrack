"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ReportQuery } from "@/types";
import { ReportingClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";

/** Reports' People report and its timeline, in one request. */
export function useReportOverview(params: ReportQuery) {
  const query = useQuery({
    queryKey: queryKeys.reporting.overview({ ...params }),
    queryFn: () => ReportingClientApi.getOverview(params),
    placeholderData: keepPreviousData,
  });

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isPlaceholderData: query.isPlaceholderData,
    refetch: query.refetch,
  };
}
