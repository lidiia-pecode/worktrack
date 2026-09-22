"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ExpectedHoursQuery } from "@/types";
import { CapacityClientApi } from "@/lib/api/resources";

import { queryKeys } from "./shared/queryKeys";

export function useExpectedHours(params: ExpectedHoursQuery) {
  const query = useQuery({
    queryKey: queryKeys.capacity.expected(params),
    queryFn: () => CapacityClientApi.getExpectedHours(params),
    placeholderData: keepPreviousData,
  });

  return {
    expectedMinutes: query.data?.expectedMinutes ?? 0,
    expectedToDateMinutes: query.data?.expectedToDateMinutes ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
