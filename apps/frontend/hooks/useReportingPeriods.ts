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
import { isoDateInTimeZone, todayISODate, toMonthKey } from "@/lib/utils/date";
import {
  firstPeriodsPage,
  lockedDateLookup,
  olderPeriodsPage,
} from "@/lib/utils/reporting-period";

import { useCompany } from "./auth/useCompany";
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

/**
 * Every month from the current one back to the company's first, twelve at a
 * time. Months before the company existed are not listed, so the page can
 * tell when there is nothing older. Waits for the company to know its first
 * month and time zone.
 */
export function useReportingPeriodHistory() {
  const { company, query: companyQuery } = useCompany();

  const firstMonth =
    company &&
    toMonthKey(
      isoDateInTimeZone(new Date(company.createdAt), company.timezone),
    );
  const currentMonth = toMonthKey(todayISODate(company?.timezone));

  const query = useInfiniteQuery({
    queryKey: queryKeys.reporting.periodHistory(),
    queryFn: ({ pageParam }) => ReportingClientApi.getPeriods(pageParam),
    enabled: Boolean(firstMonth),
    initialPageParam: firstMonth
      ? firstPeriodsPage(currentMonth, firstMonth)
      : ({} as ReportingPeriodsQuery),
    getNextPageParam: (lastPage): ReportingPeriodsQuery | undefined => {
      const oldestShownMonth = lastPage.at(-1)?.month;
      if (!oldestShownMonth || !firstMonth) return undefined;

      return olderPeriodsPage(oldestShownMonth, firstMonth) ?? undefined;
    },
  });

  return {
    months: query.data?.pages.flat() ?? [],
    isLoading: query.isPending,
    isError: query.isError || companyQuery.isError,
    // Without the company there is no first page to ask for yet; the months
    // fetch by themselves once it arrives.
    refetch: () => {
      void companyQuery.refetch();
      if (firstMonth) void query.refetch();
    },
    hasOlder: query.hasNextPage,
    loadOlder: query.fetchNextPage,
    isLoadingOlder: query.isFetchingNextPage,
  };
}

/**
 * Which days between two dates are locked, and which can be edited. Until the
 * months load, or when they fail to, no day is editable, but none is shown as
 * locked either.
 */
export function useLockedDates(dateFrom: string, dateTo: string) {
  const { months, isLoading, isError, refetch } = useReportingPeriods({
    from: toMonthKey(dateFrom),
    to: toMonthKey(dateTo),
  });

  return useMemo(() => {
    const isLocked = lockedDateLookup(months);
    const isEditable = (date: string) =>
      !isLoading && !isError && !isLocked(date);

    return { isLocked, isEditable, isError, refetch };
  }, [months, isLoading, isError, refetch]);
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
