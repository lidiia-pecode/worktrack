"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { UtilisationQuery } from "@/types";
import { ReportingClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";

export function useUtilisation(params: UtilisationQuery) {
  const query = useQuery({
    queryKey: queryKeys.reporting.utilisation({ ...params }),
    queryFn: () => ReportingClientApi.getUtilisation(params),
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
