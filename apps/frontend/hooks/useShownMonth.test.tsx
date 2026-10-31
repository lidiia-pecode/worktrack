import { useSyncExternalStore } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useShownMonth } from "./useShownMonth";

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

describe("useShownMonth", () => {
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

  it("shows the month in the URL, and the current month without one", () => {
    replaceState(null, "", "/reports?month=2026-07");
    expect(renderHook(() => useShownMonth()).result.current.month).toBe(
      "2026-07",
    );

    replaceState(null, "", "/reports");
    expect(renderHook(() => useShownMonth()).result.current.month).toBe(
      "2026-10",
    );
  });

  it("ignores a month the stepper couldn't reach: not a month, still to come or before the company", () => {
    for (const month of ["july", "2026-13", "2026-7", "2026-11", "2026-02"]) {
      replaceState(null, "", `/reports?month=${month}`);
      const { result } = renderHook(() => useShownMonth());
      expect(result.current.month).toBe("2026-10");
    }
  });

  it("writes the month to the URL, keeping the rest, and drops it for the current month", () => {
    replaceState(null, "", "/reports?person=p1");
    const { result } = renderHook(() => useShownMonth());

    act(() => result.current.showMonth("2026-08"));
    expect(window.location.search).toBe("?person=p1&month=2026-08");
    expect(result.current.month).toBe("2026-08");

    act(() => result.current.showMonth("2026-10"));
    expect(window.location.search).toBe("?person=p1");
    expect(result.current.month).toBe("2026-10");
  });
});
