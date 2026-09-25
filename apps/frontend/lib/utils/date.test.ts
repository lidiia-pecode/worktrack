import { afterEach, describe, expect, it, vi } from "vitest";

import { WeekDay } from "@/types/enums";

import {
  addDays,
  formatDuration,
  formatSignedDuration,
  getMonthGridDates,
  getMonthRange,
  getWeekDates,
  getWeekStart,
  isISODate,
  isWeekend,
  lastDayOfReportRange,
  toISODate,
  toMonthKey,
  todayISODate,
} from "./date";

// Tuesday 13 January 2026, in local time like the helpers themselves.
const TUESDAY = new Date(2026, 0, 13, 15, 30);

describe("toISODate", () => {
  it("writes the local date as YYYY-MM-DD", () => {
    expect(toISODate(TUESDAY)).toBe("2026-01-13");
    expect(toISODate(new Date(2026, 8, 5, 23, 59))).toBe("2026-09-05");
  });
});

describe("todayISODate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives today where the workspace is, not in UTC", () => {
    vi.useFakeTimers({ now: Date.parse("2026-02-07T20:00:00Z") });

    expect(todayISODate("UTC")).toBe("2026-02-07");
    expect(todayISODate("Pacific/Kiritimati")).toBe("2026-02-08");
    expect(todayISODate("Pacific/Pago_Pago")).toBe("2026-02-07");
  });

  it("falls back to the local date without a valid time zone", () => {
    vi.useFakeTimers({ now: TUESDAY });

    expect(todayISODate()).toBe("2026-01-13");
    expect(todayISODate("Not/AZone")).toBe("2026-01-13");
  });
});

describe("weeks", () => {
  it("starts a week on Monday by default", () => {
    expect(toISODate(getWeekStart(TUESDAY))).toBe("2026-01-12");
  });

  it("starts a week on Sunday when the workspace says so", () => {
    expect(toISODate(getWeekStart(TUESDAY, WeekDay.SUNDAY))).toBe("2026-01-11");
  });

  it("keeps a day that is already the week start", () => {
    const monday = new Date(2026, 0, 12);
    expect(toISODate(getWeekStart(monday))).toBe("2026-01-12");
  });

  it("lists the seven days of a week, across a month end", () => {
    const dates = getWeekDates(new Date(2026, 0, 26)).map(toISODate);

    expect(dates).toEqual([
      "2026-01-26",
      "2026-01-27",
      "2026-01-28",
      "2026-01-29",
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
    ]);
  });

  it("moves by calendar days across a daylight saving change", () => {
    // Most time zones that observe it change in late March or early April.
    expect(toISODate(addDays(new Date(2026, 2, 20), 21))).toBe("2026-04-10");
  });

  it("treats only Saturday and Sunday as the weekend", () => {
    const days = getWeekDates(new Date(2026, 0, 12)).map(isWeekend);

    expect(days).toEqual([false, false, false, false, false, true, true]);
  });
});

describe("months", () => {
  it("takes the month key of a date", () => {
    expect(toMonthKey("2026-01-13")).toBe("2026-01");
  });

  it("gives the first and last day of a month, leap years included", () => {
    expect(getMonthRange("2026-02")).toEqual({
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
    });
    expect(getMonthRange("2028-02")).toEqual({
      dateFrom: "2028-02-01",
      dateTo: "2028-02-29",
    });
    expect(getMonthRange("2026-12")).toEqual({
      dateFrom: "2026-12-01",
      dateTo: "2026-12-31",
    });
  });

  it("fills a six-week calendar grid from the week start", () => {
    const grid = getMonthGridDates(new Date(2026, 0, 13)).map(toISODate);

    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2025-12-29");
    expect(grid.at(-1)).toBe("2026-02-08");
  });

  it("starts the grid on Sunday when the workspace says so", () => {
    const [first] = getMonthGridDates(new Date(2026, 0, 13), WeekDay.SUNDAY);

    expect(toISODate(first)).toBe("2025-12-28");
  });
});

describe("report ranges", () => {
  it("accepts only a whole date with a four-digit year", () => {
    expect(isISODate("2026-01-13")).toBe(true);
    expect(isISODate("202-01-13")).toBe(false);
    expect(isISODate("20260-01-13")).toBe(false);
    expect(isISODate("2026-1-13")).toBe(false);
    expect(isISODate("")).toBe(false);
  });

  it("ends a range 366 days after it starts, both ends counted", () => {
    expect(lastDayOfReportRange("2026-01-01")).toBe("2027-01-01");
    expect(lastDayOfReportRange("2028-01-01")).toBe("2028-12-31");
  });
});

describe("durations", () => {
  it("shows hours, and minutes only when there are some", () => {
    expect(formatDuration(0)).toBe("0h");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(45)).toBe("0h 45m");
  });

  it("signs a difference, but not zero", () => {
    expect(formatSignedDuration(90)).toBe("+1h 30m");
    expect(formatSignedDuration(-120)).toBe("−2h");
    expect(formatSignedDuration(0)).toBe("0h");
  });
});
