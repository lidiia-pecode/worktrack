import { describe, expect, it } from "vitest";

import { ReportingMonthState } from "@/types/enums";

import { lockedDateLookup } from "./reporting-period";

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
