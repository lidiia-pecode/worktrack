"use client";

import { useMemo } from "react";
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

  // The previous week's figures stay cached for a smooth switch, but are never
  // shown against the next week, or it would read as behind while it loads.
  const data = query.isPlaceholderData ? undefined : query.data;

  const expectedByDate = useMemo(
    () =>
      Object.fromEntries(
        (data?.expectedByDate ?? []).map((day) => [day.date, day.minutes]),
      ) as Record<string, number | undefined>,
    [data?.expectedByDate],
  );

  return {
    expectedMinutes: data?.expectedMinutes ?? 0,
    expectedToDateMinutes: data?.expectedToDateMinutes ?? 0,
    expectedByDate,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
