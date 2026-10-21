import { describe, expect, it } from "vitest";

import {
  formatDateRange,
  formatMonthLabel,
  formatShortMonthLabel,
} from "./date";
import {
  canStepBack,
  periodHolding,
  periodLabel,
  periodRange,
  periodRangeError,
  periodText,
  stepPeriod,
  switchUnit,
} from "./report-period";

const CURRENT_MONTH = "2026-10";

describe("report periods", () => {
  it("finds the month, quarter and year a month falls in", () => {
    expect(periodHolding("month", "2026-08")).toEqual({
      unit: "month",
      firstMonth: "2026-08",
    });
    expect(periodHolding("quarter", "2026-08")).toEqual({
      unit: "quarter",
      firstMonth: "2026-07",
    });
    expect(periodHolding("year", "2026-08")).toEqual({
      unit: "year",
      firstMonth: "2026-01",
    });
  });

  it("covers whole months, quarters and years", () => {
    expect(periodRange(periodHolding("month", "2028-02"))).toEqual({
      dateFrom: "2028-02-01",
      dateTo: "2028-02-29",
    });
    expect(periodRange(periodHolding("quarter", "2026-08"))).toEqual({
      dateFrom: "2026-07-01",
      dateTo: "2026-09-30",
    });
    expect(periodRange(periodHolding("year", "2026-08"))).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
  });

  it("steps one unit at a time, across a year end", () => {
    expect(stepPeriod(periodHolding("month", "2026-01"), -1)).toEqual(
      periodHolding("month", "2025-12"),
    );
    expect(stepPeriod(periodHolding("quarter", "2026-10"), 1)).toEqual(
      periodHolding("quarter", "2027-01"),
    );
    expect(stepPeriod(periodHolding("year", "2026-10"), -1)).toEqual(
      periodHolding("year", "2025-01"),
    );
  });

  it("switches unit around the current month while the period includes it", () => {
    expect(
      switchUnit(periodHolding("year", "2026-01"), "quarter", CURRENT_MONTH),
    ).toEqual(periodHolding("quarter", "2026-10"));
    expect(
      switchUnit(periodHolding("year", "2025-01"), "quarter", CURRENT_MONTH),
    ).toEqual(periodHolding("quarter", "2025-01"));
    expect(
      switchUnit(
        { unit: "custom", dateFrom: "2026-09-03", dateTo: "2026-10-18" },
        "month",
        CURRENT_MONTH,
      ),
    ).toEqual(periodHolding("month", "2026-10"));
  });

  it("stops stepping back at the company's first month", () => {
    expect(canStepBack(periodHolding("month", "2026-03"), "2026-03")).toBe(
      false,
    );
    expect(canStepBack(periodHolding("month", "2026-04"), "2026-03")).toBe(
      true,
    );
    // The quarter before still holds March, the company's first month.
    expect(canStepBack(periodHolding("quarter", "2026-04"), "2026-03")).toBe(
      true,
    );
    expect(canStepBack(periodHolding("year", "2026-10"), "2026-03")).toBe(
      false,
    );
    expect(canStepBack(periodHolding("year", "2026-10"), undefined)).toBe(true);
  });

  it("names each period, the current year to date", () => {
    expect(
      periodLabel(periodHolding("month", "2026-10"), CURRENT_MONTH),
    ).toEqual({ name: formatMonthLabel("2026-10") });
    expect(
      periodLabel(periodHolding("quarter", "2026-08"), CURRENT_MONTH),
    ).toEqual({
      name: "Q3 2026",
      detail: `${formatShortMonthLabel("2026-07")} – ${formatShortMonthLabel("2026-09")}`,
    });
    expect(periodText(periodHolding("year", "2026-10"), CURRENT_MONTH)).toBe(
      "2026 to date",
    );
    expect(periodText(periodHolding("year", "2025-10"), CURRENT_MONTH)).toBe(
      "2025",
    );
  });

  it("reports on a custom range of at most 366 days", () => {
    const custom = {
      unit: "custom" as const,
      dateFrom: "2026-09-03",
      dateTo: "2026-10-18",
    };

    expect(periodRange(custom)).toEqual({
      dateFrom: "2026-09-03",
      dateTo: "2026-10-18",
    });
    expect(periodText(custom, CURRENT_MONTH)).toBe(
      formatDateRange("2026-09-03", "2026-10-18"),
    );
    expect(periodRangeError(custom)).toBeUndefined();
    expect(
      periodRangeError({
        ...custom,
        dateFrom: "2026-01-01",
        dateTo: "2027-01-02",
      }),
    ).toBe("At most 366 days");
  });
});
