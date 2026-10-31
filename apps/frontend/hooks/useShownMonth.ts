"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";

import { todayISODate, toMonthKey } from "@/lib/utils/date";
import { companyFirstMonth } from "@/lib/utils/reporting-period";

import { useCompany } from "./auth/useCompany";

const MONTH_PARAM = "month";
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * The month a month view shows, kept in `?month=` (YYYY-MM), as `useShownWeek`
 * keeps the week. Without one it is the company's current month. A value that
 * isn't a month, is still to come or is before the company's first month is
 * ignored, since the month stepper could never have reached it.
 *
 * The URL is the only record of a chosen month, so a reload, a link and Back
 * all show the month the address names. A move back to the current month
 * removes it.
 */
export function useShownMonth() {
  const { company } = useCompany();
  const searchParams = useSearchParams();

  const currentMonth = toMonthKey(todayISODate(company?.timezone));
  const firstMonth = company ? companyFirstMonth(company) : undefined;

  const linkedMonth = searchParams.get(MONTH_PARAM);
  const isShowable =
    linkedMonth !== null &&
    MONTH_KEY.test(linkedMonth) &&
    linkedMonth <= currentMonth &&
    (firstMonth === undefined || linkedMonth >= firstMonth);
  const month = isShowable ? linkedMonth : currentMonth;

  // Through the history API, as the side panels do, so the page isn't
  // rendered again from the server; the panels' own parameters stay.
  const showMonth = useCallback(
    (nextMonth: string) => {
      const url = new URL(window.location.href);
      if (nextMonth === currentMonth) url.searchParams.delete(MONTH_PARAM);
      else url.searchParams.set(MONTH_PARAM, nextMonth);
      window.history.replaceState(null, "", url);
    },
    [currentMonth],
  );

  return { month, currentMonth, firstMonth, showMonth };
}
