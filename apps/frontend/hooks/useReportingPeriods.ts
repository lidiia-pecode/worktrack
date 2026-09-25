"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ReportingPeriodsQuery } from "@/types";
import { ReportingMonthState } from "@/types/enums";
import { ReportingClientApi } from "@/lib/api/resources";
import { toMonthKey } from "@/lib/utils/date";
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
