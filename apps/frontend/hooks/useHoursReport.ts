"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";

import { HoursReportQuery } from "@/types";
import { ReportingClientApi } from "@/lib/api/resources";
import { saveFile } from "@/lib/utils/save-file";

import { queryKeys } from "./shared/queryKeys";

export function useHoursReport(params: HoursReportQuery) {
  const query = useQuery({
    queryKey: queryKeys.reporting.hours({ ...params }),
    queryFn: () => ReportingClientApi.getHoursReport(params),
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

/** Downloads the hours behind the report as an Excel file. */
export function useHoursExport() {
  return useMutation({
    mutationFn: ReportingClientApi.exportHours,
    onSuccess: saveFile,
  });
}
