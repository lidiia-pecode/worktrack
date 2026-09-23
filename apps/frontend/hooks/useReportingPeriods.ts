"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ReportingPeriodsQuery } from "@/types";
import { ReportingClientApi } from "@/lib/api/resources";

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
