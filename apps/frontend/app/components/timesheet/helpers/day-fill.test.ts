import { describe, expect, it } from "vitest";

import { EXCESS_FILL } from "../consts";
import { dayFill } from "./day-fill";

describe("dayFill", () => {
  const workingDay = { isAbsent: false, isWeekend: false };

  it("marks a working day's time past the person's figure", () => {
    expect(
      dayFill({ ...workingDay, minutes: 9 * 60, expectedMinutes: 8 * 60 }),
    ).toBe(EXCESS_FILL);
  });

  it("marks nothing on a day that expects nothing, as at 0h", () => {
    expect(
      dayFill({ ...workingDay, minutes: 3 * 60, expectedMinutes: 0 }),
    ).toBeUndefined();
  });
});
