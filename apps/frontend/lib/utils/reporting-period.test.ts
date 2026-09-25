import { describe, expect, it } from "vitest";

import { ReportingMonthState } from "@/types/enums";

import { Absence } from "@/types";

import {
  isRangeLocked,
  lockLookupRange,
  lockedDateLookup,
} from "./reporting-period";

const month = (key: string, state: ReportingMonthState) => ({
  month: key,
  state,
  editableUntil: null,
});

describe("lockedDateLookup", () => {
  const isLocked = lockedDateLookup([
    month("2026-03", ReportingMonthState.OPEN),
    month("2026-02", ReportingMonthState.GRACE),
    month("2026-01", ReportingMonthState.LOCKED),
    month("2025-12", ReportingMonthState.REOPENED),
  ]);

  it("locks every day of a locked month", () => {
    expect(isLocked("2026-01-01")).toBe(true);
    expect(isLocked("2026-01-31")).toBe(true);
  });

  it("leaves open, grace and reopened months writable", () => {
    expect(isLocked("2026-03-10")).toBe(false);
    expect(isLocked("2026-02-10")).toBe(false);
    expect(isLocked("2025-12-10")).toBe(false);
  });

  it("locks nothing before the months load", () => {
    expect(lockedDateLookup([])("2026-01-10")).toBe(false);
  });
});

describe("isRangeLocked", () => {
  const isLocked = lockedDateLookup([
    month("2026-02", ReportingMonthState.OPEN),
    month("2026-01", ReportingMonthState.LOCKED),
  ]);

  it("is locked when any month of the range is", () => {
    expect(isRangeLocked(isLocked, "2026-01-28", "2026-02-03")).toBe(true);
  });

  it("is open when every month of the range is", () => {
    expect(isRangeLocked(isLocked, "2026-02-01", "2026-02-20")).toBe(false);
  });

  it("checks the months in between, not only the ends", () => {
    expect(isRangeLocked(isLocked, "2025-12-20", "2026-03-05")).toBe(true);
  });
});

describe("lockLookupRange", () => {
  const absence = (startDate: string, endDate: string) =>
    ({ startDate, endDate }) as Absence;
  const TODAY = "2026-09-25";

  it("is the week itself when there are no absences", () => {
    expect(lockLookupRange("2026-09-07", "2026-09-13", [], TODAY)).toEqual({
      dateFrom: "2026-09-07",
      dateTo: "2026-09-13",
    });
  });

  it("reaches back to where an absence starts", () => {
    expect(
      lockLookupRange(
        "2026-09-07",
        "2026-09-13",
        [absence("2026-08-25", "2026-09-08")],
        TODAY,
      ),
    ).toEqual({ dateFrom: "2026-08-25", dateTo: "2026-09-13" });
  });

  it("reaches forward only as far as today", () => {
    expect(
      lockLookupRange(
        "2026-09-07",
        "2026-09-13",
        [absence("2026-09-10", "2026-12-31")],
        TODAY,
      ),
    ).toEqual({ dateFrom: "2026-09-07", dateTo: TODAY });
  });

  it("covers at most 36 months", () => {
    expect(
      lockLookupRange(
        "2026-09-07",
        "2026-09-13",
        [absence("2020-01-01", "2026-09-08")],
        TODAY,
      ),
    ).toEqual({ dateFrom: "2023-10-01", dateTo: "2026-09-13" });
  });
});
