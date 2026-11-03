"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ReportQuery } from "@/types";
import { ReportingClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";

export function usePeopleReport(
  params: ReportQuery,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const query = useQuery({
    queryKey: queryKeys.reporting.people({ ...params }),
    queryFn: () => ReportingClientApi.getPeopleReport(params),
    placeholderData: keepPreviousData,
    enabled,
  });

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    isPlaceholderData: query.isPlaceholderData,
    isError: query.isError,
    refetch: query.refetch,
  };
}
