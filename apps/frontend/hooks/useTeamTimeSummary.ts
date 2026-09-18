"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { TeamSummaryQuery } from "@/types";
import { TimeLogsClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";

const EMPTY_TOTALS = {
  minutes: 0,
  billableMinutes: 0,
  nonBillableMinutes: 0,
};

/**
 * The team's logged time for a date range, already aggregated by the backend:
 * one row per person the caller may see. Keeps the previous range on screen
 * while the next one loads, so changing week dims the table instead of
 * blanking it.
 */
export function useTeamTimeSummary(params: TeamSummaryQuery) {
  const query = useQuery({
    queryKey: queryKeys.timelogs.teamSummary(params),
    queryFn: () => TimeLogsClientApi.getTeamSummary(params),
    placeholderData: keepPreviousData,
  });

  return {
    rows: query.data?.rows ?? [],

    totals: query.data
      ? {
          minutes: query.data.minutes,
          billableMinutes: query.data.billableMinutes,
          nonBillableMinutes: query.data.nonBillableMinutes,
        }
      : EMPTY_TOTALS,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}
