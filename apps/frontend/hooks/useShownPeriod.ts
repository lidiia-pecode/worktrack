"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

import { getMonthRange, todayISODate } from "@/lib/utils/date";
import { companyFirstMonth } from "@/lib/utils/reporting-period";
import {
  isShowablePeriod,
  PERIOD_PARAMS,
  periodFromParams,
  periodOf,
  periodToParams,
  ShownPeriod,
} from "@/lib/utils/shown-period";

import { useCompany } from "./auth/useCompany";

/**
 * The period Reports shows, kept in the address as `?month=`, `?quarter=`,
 * `?year=` or `?from=&to=`, as `useShownMonth` keeps a month. Without one, or
 * with one that hasn't started or ends before the company's first month, it is
 * the current month, which the address leaves out.
 */
export function useShownPeriod() {
  const { company } = useCompany();
  const searchParams = useSearchParams();

  const today = todayISODate(company?.timezone);
  const firstDay = company
    ? getMonthRange(companyFirstMonth(company)).dateFrom
    : undefined;

  const linked = periodFromParams(searchParams);
  const period =
    linked && isShowablePeriod(linked, today, firstDay)
      ? linked
      : periodOf("month", today);

  // Through the history API, as the side panels do, so the page isn't
  // rendered again from the server; the panels' own parameters stay.
  const showPeriod = useCallback(
    (next: ShownPeriod) => {
      const url = new URL(window.location.href);
      PERIOD_PARAMS.forEach((param) => url.searchParams.delete(param));
      Object.entries(periodToParams(next, today)).forEach(([param, value]) =>
        url.searchParams.set(param, value),
      );
      window.history.replaceState(null, "", url);
    },
    [today],
  );

  return { period, today, firstDay, showPeriod };
}
