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

  // Keyed by date, so a previous week kept on screen while the next one loads
  // answers nothing for the new dates.
  const expectedByDate = useMemo(
    () =>
      Object.fromEntries(
        (query.data?.expectedByDate ?? []).map((day) => [
          day.date,
          day.minutes,
        ]),
      ) as Record<string, number | undefined>,
    [query.data?.expectedByDate],
  );

  return {
    expectedMinutes: query.data?.expectedMinutes ?? 0,
    expectedToDateMinutes: query.data?.expectedToDateMinutes ?? 0,
    expectedByDate,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
