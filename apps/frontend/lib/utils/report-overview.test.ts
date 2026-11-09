import { describe, expect, it } from "vitest";

import { personDays } from "./report-overview";

describe("personDays", () => {
  // 5–9 October 2026 is Monday to Friday; the 10th and 11th are a weekend.
  const input = {
    dateFrom: "2026-10-05",
    dateTo: "2026-10-11",
    countedUntil: null,
    loggedByDate: new Map([
      ["2026-10-05", 480],
      ["2026-10-11", 60],
    ]),
    isClosed: () => false,
    isOff: (date: string) => date === "2026-10-06",
    daysWithoutTime: new Set(["2026-10-07"]),
  };

  it("marks each working day, and a weekend only when time was logged", () => {
    expect(personDays(input).map((day) => [day.date, day.kind])).toEqual([
      ["2026-10-05", "logged"],
      ["2026-10-06", "off"],
      ["2026-10-07", "withoutTime"],
      ["2026-10-08", "nothingExpected"],
      ["2026-10-09", "nothingExpected"],
      ["2026-10-11", "logged"],
    ]);
  });

  it("closes a day the view doesn't hold, before a day off or a day to come", () => {
    const days = personDays({
      ...input,
      countedUntil: "2026-10-07",
      isClosed: (date: string) => date >= "2026-10-06",
    });

    expect(days.map((day) => [day.date, day.kind])).toEqual([
      ["2026-10-05", "logged"],
      ["2026-10-06", "closed"],
      ["2026-10-07", "closed"],
      ["2026-10-08", "closed"],
      ["2026-10-09", "closed"],
      ["2026-10-11", "logged"],
    ]);
  });

  it("shows the whole period: today, then the days to come with what is already on them", () => {
    const days = personDays({
      ...input,
      countedUntil: "2026-10-06",
      isOff: (date: string) => date === "2026-10-09",
    });

    expect(days.map((day) => [day.date, day.kind, day.when])).toEqual([
      ["2026-10-05", "logged", "past"],
      ["2026-10-06", "nothingExpected", "past"],
      ["2026-10-07", "pending", "today"],
      ["2026-10-08", "pending", "future"],
      ["2026-10-09", "off", "future"],
      ["2026-10-11", "logged", "future"],
    ]);
  });
});
