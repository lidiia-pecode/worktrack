import { describe, expect, it } from "vitest";

import { getRangeError } from "./ReportsView";

describe("getRangeError", () => {
  it("accepts a valid range", () => {
    expect(
      getRangeError({ dateFrom: "2026-01-01", dateTo: "2026-01-31" }),
    ).toBeUndefined();
  });

  it("accepts a single day", () => {
    expect(
      getRangeError({ dateFrom: "2026-01-13", dateTo: "2026-01-13" }),
    ).toBeUndefined();
  });

  it("asks for both dates", () => {
    expect(getRangeError({ dateFrom: "2026-01-01", dateTo: "" })).toBe(
      "Pick both dates",
    );
  });

  it("refuses a year that is not four digits", () => {
    expect(
      getRangeError({ dateFrom: "20260-01-01", dateTo: "2026-01-31" }),
    ).toBe("Use a four-digit year");
  });

  it("refuses a range that runs backwards", () => {
    expect(
      getRangeError({ dateFrom: "2026-02-01", dateTo: "2026-01-31" }),
    ).toBe("Must be on or after From");
  });

  it("allows 366 days and no more", () => {
    expect(
      getRangeError({ dateFrom: "2026-01-01", dateTo: "2027-01-01" }),
    ).toBeUndefined();
    expect(
      getRangeError({ dateFrom: "2026-01-01", dateTo: "2027-01-02" }),
    ).toBe("At most 366 days");
  });
});
