import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReportingMonth, ReportingPeriodsQuery } from "@/types";
import { ReportingMonthState } from "@/types/enums";
import { ReportingClientApi } from "@/lib/api/resources";
import { addMonthsToKey } from "@/lib/utils/date";

import { useReportingPeriodHistory } from "./useReportingPeriods";

vi.mock("@/lib/api/resources", () => ({
  ReportingClientApi: { getPeriods: vi.fn() },
}));

let company: { createdAt: string; timezone: string };

vi.mock("@/hooks/auth/useCompany", () => ({
  useCompany: () => ({
    company,
    query: { isError: false, refetch: vi.fn() },
  }),
}));

const CURRENT_MONTH = "2026-10";

// The server's answer: every month of the range, newest first, ending at its
// today when no end is given.
const monthsFor = ({ from, to }: ReportingPeriodsQuery): ReportingMonth[] => {
  const months: ReportingMonth[] = [];

  for (let month = to ?? CURRENT_MONTH; month >= from!;) {
    months.push({
      month,
      state: ReportingMonthState.LOCKED,
      editableUntil: null,
      changedBy: null,
      changedAt: null,
    });
    month = addMonthsToKey(month, -1);
  }

  return months;
};

const renderHistory = () =>
  renderHook(() => useReportingPeriodHistory(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    ),
  });

describe("useReportingPeriodHistory", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T12:00:00Z"));
    vi.mocked(ReportingClientApi.getPeriods).mockImplementation((params) =>
      Promise.resolve(monthsFor(params ?? {})),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(ReportingClientApi.getPeriods).mockReset();
  });

  it("starts at the company's first month and offers nothing older", async () => {
    company = { createdAt: "2026-08-15T10:00:00Z", timezone: "UTC" };

    const { result } = renderHistory();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(ReportingClientApi.getPeriods).toHaveBeenCalledWith({
      from: "2026-08",
    });
    expect(result.current.months.map((m) => m.month)).toEqual([
      "2026-10",
      "2026-09",
      "2026-08",
    ]);
    expect(result.current.hasOlder).toBe(false);
  });

  it("pages back twelve months at a time until the first month is shown", async () => {
    company = { createdAt: "2025-06-02T10:00:00Z", timezone: "UTC" };

    const { result } = renderHistory();

    await waitFor(() => expect(result.current.months).toHaveLength(12));
    expect(result.current.hasOlder).toBe(true);

    await result.current.loadOlder();

    await waitFor(() => expect(result.current.months).toHaveLength(17));
    expect(ReportingClientApi.getPeriods).toHaveBeenLastCalledWith({
      from: "2025-06",
      to: "2025-10",
    });
    expect(result.current.hasOlder).toBe(false);
  });
});
