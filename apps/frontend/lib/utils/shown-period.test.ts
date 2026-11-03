import { describe, expect, it } from "vitest";

import { periodOf, ShownPeriod, stepPeriod, switchUnit } from "./shown-period";

const TODAY = "2026-11-02";

const rangeOf = ({ range }: ShownPeriod) => [range.dateFrom, range.dateTo];

describe("switchUnit", () => {
  it("opens a larger unit on the one that holds the period shown", () => {
    const october = periodOf("month", "2026-10-15");

    expect(rangeOf(switchUnit(october, "quarter", TODAY))).toEqual([
      "2026-10-01",
      "2026-12-31",
    ]);
    expect(rangeOf(switchUnit(october, "year", TODAY))).toEqual([
      "2026-01-01",
      "2026-12-31",
    ]);
  });

  it("opens a smaller unit on the last part of the period, never past today", () => {
    const lastYear = periodOf("year", "2025-06-01");
    const thisYear = periodOf("year", TODAY);

    expect(rangeOf(switchUnit(lastYear, "quarter", TODAY))).toEqual([
      "2025-10-01",
      "2025-12-31",
    ]);
    expect(rangeOf(switchUnit(lastYear, "month", TODAY))).toEqual([
      "2025-12-01",
      "2025-12-31",
    ]);
    expect(rangeOf(switchUnit(thisYear, "month", TODAY))).toEqual([
      "2026-11-01",
      "2026-11-30",
    ]);
  });

  it("keeps the dates shown when switching to Custom", () => {
    expect(switchUnit(periodOf("quarter", TODAY), "custom", TODAY)).toEqual({
      unit: "custom",
      range: { dateFrom: "2026-10-01", dateTo: "2026-12-31" },
    });
  });
});

describe("stepPeriod", () => {
  it("steps a calendar unit across a year end, and a custom range by its length", () => {
    expect(rangeOf(stepPeriod(periodOf("quarter", "2026-02-10"), -1))).toEqual([
      "2025-10-01",
      "2025-12-31",
    ]);

    const tenDays: ShownPeriod = {
      unit: "custom",
      range: { dateFrom: "2026-10-05", dateTo: "2026-10-14" },
    };
    expect(rangeOf(stepPeriod(tenDays, 1))).toEqual([
      "2026-10-15",
      "2026-10-24",
    ]);
  });
});
