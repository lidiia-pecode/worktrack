import { describe, expect, it } from "vitest";

import {
  changeLabel,
  changeTipLines,
  periodChange,
  personDays,
} from "./report-overview";

const HOUR = 60;

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

describe("periodChange", () => {
  const HOUR = 60;
  const figures = (
    logged: number,
    planned: number,
    billable: number,
    expected: number,
  ) => ({
    loggedMinutes: logged * HOUR,
    plannedMinutes: planned * HOUR,
    billableMinutes: billable * HOUR,
    expectedMinutes: expected * HOUR,
  });

  it("compares each share in points between the shares shown, with the hours behind it", () => {
    // 94% logged after 90%, 89% planned after 91%, 60% billable after 63%.
    const change = periodChange(
      figures(94, 89, 56.4, 100),
      figures(90, 91, 56.7, 100),
    );

    expect(change.logged).toEqual({
      points: 4,
      minutes: 4 * HOUR,
      share: 94,
      previousShare: 90,
      previousMinutes: 90 * HOUR,
    });
    expect(change.planned).toMatchObject({ points: -2, minutes: -2 * HOUR });
    expect(change.billable?.points).toBe(-3);
  });

  it("has no change for a figure with nothing to measure it against in either period", () => {
    const change = periodChange(figures(10, 0, 0, 40), figures(0, 0, 0, 0));

    expect(change).toEqual({ logged: null, planned: null, billable: null });
  });
});

describe("changeTipLines", () => {
  const change = (
    share: number,
    previousShare: number,
    minutes: number,
    previousMinutes = 1,
  ) => ({
    points: share - previousShare,
    minutes,
    share,
    previousShare,
    previousMinutes,
  });

  it("says the points, both shares and the hours behind them", () => {
    expect(changeTipLines(change(94, 97, -109 * 60), "September 2026")).toEqual(
      ["Down 3 points from September 2026", "97% → 94% · about 109h less"],
    );
    expect(changeTipLines(change(91, 90, 24 * 60), "Q2 2026")[0]).toBe(
      "Up 1 point from Q2 2026",
    );
  });

  it("says when the previous period had nothing to compare with", () => {
    expect(changeTipLines(change(95, 0, 150 * HOUR, 0), "Q2 2026")).toEqual([
      "Up 95 points from Q2 2026",
      "0% → 95% · about 150h more",
      "Nothing logged in Q2 2026",
    ]);
    expect(
      changeTipLines(change(80, 0, 40 * HOUR, 0), "Q2 2026", "planned")[2],
    ).toBe("Nothing planned in Q2 2026");
  });

  it("calls no change the same, and sizes a change in points", () => {
    expect(changeTipLines(change(89, 89, 6 * 60), "September 2026")).toEqual([
      "Same as September 2026 · 89%",
    ]);
    expect(changeLabel(change(89, 89, 0))).toBe("0 pts");
    expect(changeLabel(change(90, 91, 0))).toBe("1 pt");
  });
});
