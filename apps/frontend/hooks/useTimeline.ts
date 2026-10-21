"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { PeopleReportQuery } from "@/types";
import { ReportingClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";

/** The period's hours week by week, or month by month for a longer one. */
export function useTimeline(params: PeopleReportQuery, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.reporting.timeline({ ...params }),
    queryFn: () => ReportingClientApi.getTimeline(params),
    placeholderData: keepPreviousData,
    enabled,
  });

  return {
    timeline: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
