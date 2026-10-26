import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toISODate } from "@/lib/utils/date";
import { WeekDay } from "@/types/enums";

import { useShownWeek } from "./useShownWeek";

vi.mock("./useWorkSettings", () => ({
  useWorkSettings: () => ({ weekStartDay: WeekDay.MONDAY, timezone: "UTC" }),
}));

const SUNDAY_EVENING = new Date("2026-10-18T20:00:00Z");
const MONDAY_MORNING = new Date("2026-10-19T08:00:00Z");

const comeBackToTab = () =>
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });

describe("useShownWeek", () => {
  afterEach(() => vi.useRealTimers());

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

  it("starts on the week of a day from a link, and ignores one that isn't a date", () => {
    vi.useFakeTimers({ now: SUNDAY_EVENING });

    const linked = renderHook(() => useShownWeek("2026-09-09"));
    expect(toISODate(linked.result.current.weekStart)).toBe("2026-09-07");

    for (const day of ["next-week", "2026-13-40"]) {
      const { result } = renderHook(() => useShownWeek(day));
      expect(toISODate(result.current.weekStart)).toBe("2026-10-12");
    }
  });
});
