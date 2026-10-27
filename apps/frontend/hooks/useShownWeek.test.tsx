import { useSyncExternalStore } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toISODate } from "@/lib/utils/date";
import { WeekDay } from "@/types/enums";

import { useShownWeek } from "./useShownWeek";

vi.mock("./useWorkSettings", () => ({
  useWorkSettings: () => ({ weekStartDay: WeekDay.MONDAY, timezone: "UTC" }),
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

const SUNDAY_EVENING = new Date("2026-10-18T20:00:00Z");
const MONDAY_MORNING = new Date("2026-10-19T08:00:00Z");

const comeBackToTab = () =>
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });

describe("useShownWeek", () => {
  const replaceState = window.history.replaceState.bind(window.history);

  beforeEach(() => {
    replaceState(null, "", "/team");
    vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
      replaceState(...args);
      urlListeners.forEach((onChange) => onChange());
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("moves on to the new week when a tab left open is shown again", () => {
    vi.useFakeTimers({ now: SUNDAY_EVENING });
    const { result } = renderHook(() => useShownWeek());
    expect(toISODate(result.current.weekStart)).toBe("2026-10-12");

    vi.setSystemTime(MONDAY_MORNING);
    comeBackToTab();

    expect(toISODate(result.current.weekStart)).toBe("2026-10-19");
  });

  it("keeps a week somebody chose", () => {
    vi.useFakeTimers({ now: SUNDAY_EVENING });
    const { result } = renderHook(() => useShownWeek());
    act(() => result.current.showWeekOf(new Date(2026, 8, 9)));

    vi.setSystemTime(MONDAY_MORNING);
    comeBackToTab();

    expect(toISODate(result.current.weekStart)).toBe("2026-09-07");
  });

  it("shows the week of a day in the URL, and ignores one that isn't a date", () => {
    vi.useFakeTimers({ now: SUNDAY_EVENING });

    replaceState(null, "", "/team?week=2026-09-09");
    const linked = renderHook(() => useShownWeek());
    expect(toISODate(linked.result.current.weekStart)).toBe("2026-09-07");

    for (const day of ["next-week", "2026-13-40", "2026-02-31"]) {
      replaceState(null, "", `/team?week=${day}`);
      const { result } = renderHook(() => useShownWeek());
      expect(toISODate(result.current.weekStart)).toBe("2026-10-12");
    }
  });

  it("writes the week's first day to the URL, keeping the rest", () => {
    vi.useFakeTimers({ now: SUNDAY_EVENING, toFake: ["Date"] });
    replaceState(null, "", "/team?week=2026-09-09&person=p1");
    const { result } = renderHook(() => useShownWeek());

    act(() => result.current.showWeekOf(new Date(2026, 8, 16)));

    expect(window.location.search).toBe("?week=2026-09-14&person=p1");
    expect(toISODate(result.current.weekStart)).toBe("2026-09-14");
  });

  it("drops the week from the URL on a move back to this week", () => {
    vi.useFakeTimers({ now: SUNDAY_EVENING, toFake: ["Date"] });
    replaceState(null, "", "/team?week=2026-09-09&person=p1");
    const { result } = renderHook(() => useShownWeek());

    act(() => result.current.showWeekOf(new Date(2026, 9, 14)));

    expect(window.location.search).toBe("?person=p1");
    expect(toISODate(result.current.weekStart)).toBe("2026-10-12");
  });

  it("follows the URL back to today when the week leaves it", () => {
    vi.useFakeTimers({ now: SUNDAY_EVENING, toFake: ["Date"] });
    replaceState(null, "", "/team?week=2026-09-09");
    const { result } = renderHook(() => useShownWeek());

    act(() => window.history.replaceState(null, "", "/team"));

    expect(toISODate(result.current.weekStart)).toBe("2026-10-12");
  });
});
