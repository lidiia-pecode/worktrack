import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ExpectedHours, ExpectedHoursQuery } from "@/types";
import { CapacityClientApi } from "@/lib/api/resources";

import { useExpectedHours } from "./useExpectedHours";

vi.mock("@/lib/api/resources", () => ({
  CapacityClientApi: { getExpectedHours: vi.fn() },
}));

const THIS_WEEK = { dateFrom: "2026-10-12", dateTo: "2026-10-18" };
const NEXT_WEEK = { dateFrom: "2026-10-19", dateTo: "2026-10-25" };

const thisWeek: ExpectedHours = {
  ...THIS_WEEK,
  expectedMinutes: 960,
  expectedToDateMinutes: 960,
  expectedByDate: [{ date: "2026-10-12", minutes: 240 }],
};

describe("useExpectedHours", () => {
  it("shows nothing of the previous week while the next one loads", async () => {
    vi.mocked(CapacityClientApi.getExpectedHours).mockImplementation(
      (params: ExpectedHoursQuery) =>
        params.dateFrom === THIS_WEEK.dateFrom
          ? Promise.resolve(thisWeek)
          : new Promise(() => {}),
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      (params: ExpectedHoursQuery) => useExpectedHours(params),
      { wrapper, initialProps: THIS_WEEK },
    );

    await waitFor(() => expect(result.current.expectedMinutes).toBe(960));

    rerender(NEXT_WEEK);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.expectedMinutes).toBe(0);
    expect(result.current.expectedToDateMinutes).toBe(0);
    expect(result.current.expectedByDate).toEqual({});
  });
});
