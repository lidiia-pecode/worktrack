import { useSyncExternalStore } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShownPeriod } from "@/lib/utils/shown-period";

import { useShownPeriod } from "./useShownPeriod";

vi.mock("./auth/useCompany", () => ({
  useCompany: () => ({
    company: { timezone: "UTC", createdAt: "2026-03-10T00:00:00Z" },
  }),
}));

// Next's router re-renders on a `history.replaceState`; this does the same.
const urlListeners = new Set<() => void>();
vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(
      useSyncExternalStore(
        (onChange) => {
          urlListeners.add(onChange);
          return () => urlListeners.delete(onChange);
        },
        () => window.location.search,
      ),
    ),
}));

const NOW = new Date("2026-10-24T09:00:00Z");
const OCTOBER: ShownPeriod = {
  unit: "month",
  range: { dateFrom: "2026-10-01", dateTo: "2026-10-31" },
};

const shownAt = (search: string) => {
  window.history.replaceState(null, "", `/reports${search}`);
  return renderHook(() => useShownPeriod()).result.current.period;
};

describe("useShownPeriod", () => {
  const replaceState = window.history.replaceState.bind(window.history);

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    replaceState(null, "", "/reports");
    vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
      replaceState(...args);
      urlListeners.forEach((onChange) => onChange());
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reads each kind of period from the URL, and the current month without one", () => {
    expect(shownAt("?month=2026-07")).toEqual({
      unit: "month",
      range: { dateFrom: "2026-07-01", dateTo: "2026-07-31" },
    });
    expect(shownAt("?quarter=2026-Q3")).toEqual({
      unit: "quarter",
      range: { dateFrom: "2026-07-01", dateTo: "2026-09-30" },
    });
    expect(shownAt("?year=2026")).toEqual({
      unit: "year",
      range: { dateFrom: "2026-01-01", dateTo: "2026-12-31" },
    });
    expect(shownAt("?from=2026-09-15&to=2026-10-14")).toEqual({
      unit: "custom",
      range: { dateFrom: "2026-09-15", dateTo: "2026-10-14" },
    });
    expect(shownAt("")).toEqual(OCTOBER);
  });

  it("falls back to the current month for what isn't a period, hasn't started or ends before the company", () => {
    for (const search of [
      "?month=2026-13",
      "?quarter=2026-Q5",
      "?year=26",
      "?from=2026-02-31&to=2026-03-31",
      "?from=2026-10-01&to=2026-09-01",
      "?from=2025-10-01&to=2026-10-02",
      "?month=2026-11",
      "?year=2027",
      "?month=2026-02",
      "?year=2025",
    ]) {
      expect(shownAt(search)).toEqual(OCTOBER);
    }
  });

  it("writes each kind of period to the URL, keeping the panels' parameters, and drops the current month", () => {
    replaceState(null, "", "/reports?person=p1&month=2026-08");
    const { result } = renderHook(() => useShownPeriod());

    act(() =>
      result.current.showPeriod({
        unit: "quarter",
        range: { dateFrom: "2026-07-01", dateTo: "2026-09-30" },
      }),
    );
    expect(window.location.search).toBe("?person=p1&quarter=2026-Q3");

    act(() =>
      result.current.showPeriod({
        unit: "custom",
        range: { dateFrom: "2026-09-15", dateTo: "2026-10-14" },
      }),
    );
    expect(window.location.search).toBe(
      "?person=p1&from=2026-09-15&to=2026-10-14",
    );

    act(() =>
      result.current.showPeriod({
        unit: "year",
        range: { dateFrom: "2026-01-01", dateTo: "2026-12-31" },
      }),
    );
    expect(window.location.search).toBe("?person=p1&year=2026");

    act(() => result.current.showPeriod(OCTOBER));
    expect(window.location.search).toBe("?person=p1");
    expect(result.current.period).toEqual(OCTOBER);
  });
});
