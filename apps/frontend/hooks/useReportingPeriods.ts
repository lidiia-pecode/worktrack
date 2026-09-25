"use client";

import { useMemo } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { ReportingPeriodsQuery } from "@/types";
import { ReportingMonthState } from "@/types/enums";
import { ReportingClientApi } from "@/lib/api/resources";
import { addMonthsToKey, toMonthKey } from "@/lib/utils/date";
import { lockedDateLookup } from "@/lib/utils/reporting-period";

import { queryKeys } from "./shared/queryKeys";

export function useReportingPeriods(params: ReportingPeriodsQuery = {}) {
  const query = useQuery({
    queryKey: queryKeys.reporting.periods({ ...params }),
    queryFn: () => ReportingClientApi.getPeriods(params),
  });

  return {
    months: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

const MONTHS_PER_PAGE = 12;

/**
 * Every month from the current one back, twelve at a time. There is no lower
 * bound: time can be logged on any past date, so any month may need reopening.
 */
export function useReportingPeriodHistory() {
  const query = useInfiniteQuery({
    queryKey: queryKeys.reporting.periodHistory(),
    queryFn: ({ pageParam }) => ReportingClientApi.getPeriods(pageParam),
    // The first page is the server's default: the last twelve months.
    initialPageParam: {} as ReportingPeriodsQuery,
    getNextPageParam: (lastPage): ReportingPeriodsQuery | undefined => {
      const oldestLoadedMonth = lastPage.at(-1)?.month;
      if (!oldestLoadedMonth) return undefined;

      const to = addMonthsToKey(oldestLoadedMonth, -1);
      const from = addMonthsToKey(to, -(MONTHS_PER_PAGE - 1));

      return { from, to };
    },
  });

  return {
    months: query.data?.pages.flat() ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    loadOlder: query.fetchNextPage,
    isLoadingOlder: query.isFetchingNextPage,
  };
}

/**
 * Which days between two dates are locked, and which can be edited. Until the
 * months load no day is editable, but none is shown as locked either.
 */
export function useLockedDates(dateFrom: string, dateTo: string) {
  const { months, isLoading } = useReportingPeriods({
    from: toMonthKey(dateFrom),
    to: toMonthKey(dateTo),
  });

  return useMemo(() => {
    const isLocked = lockedDateLookup(months);
    const isEditable = (date: string) => !isLoading && !isLocked(date);

    return { isLocked, isEditable };
  }, [months, isLoading]);
}

/** The month that is past its end but still editable, if there is one. */
export function useGraceMonth() {
  const { months } = useReportingPeriods();

  return months.find((period) => period.state === ReportingMonthState.GRACE);
}

export function useReportingPeriodMutations() {
  const queryClient = useQueryClient();

  const onSuccess = (message: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reporting.all });
    toast.success(message);
  };

  const reopen = useMutation({
    mutationFn: ReportingClientApi.reopenPeriod,
    onSuccess: () => onSuccess("Month reopened"),
  });

  const close = useMutation({
    mutationFn: ReportingClientApi.closePeriod,
    onSuccess: () => onSuccess("Month closed"),
  });

  return { reopen, close };
}
