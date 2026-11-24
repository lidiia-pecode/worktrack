import { describe, expect, it } from "vitest";

import {
  changeableDays,
  firstFreeWorkingDay,
  firstUnavailableIn,
  latestLastDayFrom,
  partDayError,
  unavailableDaysWindow,
} from "./absence-form-rules";

const taken =
  (...days: string[]) =>
  (date: string) =>
    days.includes(date);

describe("unavailableDaysWindow", () => {
  it("covers the shown month with the grid's days around it", () => {
    expect(
      unavailableDaysWindow("2026-11-01", "2026-11-10", "2026-11-12"),
    ).toEqual({ from: "2026-10-25", to: "2026-12-15" });
  });

  it("still covers the chosen days once a picker shows another month", () => {
    // The pickers share the month on show: a first day in November stays
    // read while the last day's picker is on January.
    expect(
      unavailableDaysWindow("2027-01-01", "2026-11-10", "2026-11-12"),
    ).toEqual({ from: "2026-11-10", to: "2027-02-15" });
    expect(
      unavailableDaysWindow("2026-09-01", "2026-11-10", "2026-11-12"),
    ).toEqual({ from: "2026-08-25", to: "2026-12-01" });
  });
});

describe("latestLastDayFrom", () => {
  it("stops the day before the first day the absence can't take", () => {
    expect(latestLastDayFrom("2026-11-10", taken("2026-11-13"))).toBe(
      "2026-11-12",
    );
  });

  it("ignores the first day itself, and reaches 366 days when all are free", () => {
    expect(latestLastDayFrom("2026-11-10", taken("2026-11-10"))).toBe(
      "2027-11-10",
    );
  });
});

describe("firstFreeWorkingDay", () => {
  it("skips taken days and the weekend", () => {
    // Friday the 13th is taken, the 14th and 15th are the weekend.
    expect(
      firstFreeWorkingDay("2026-11-13", "2026-11-30", taken("2026-11-13")),
    ).toBe("2026-11-16");
  });

  it("finds none when every working day up to the end is taken", () => {
    expect(
      firstFreeWorkingDay("2026-11-13", "2026-11-15", taken("2026-11-13")),
    ).toBeUndefined();
  });
});

describe("the chosen days checked before a save", () => {
  it("names the first day of the range the absence can't take", () => {
    expect(
      firstUnavailableIn(
        changeableDays("2026-11-10", "2026-11-13"),
        taken("2026-11-12", "2026-11-13"),
      ),
    ).toBe("2026-11-12");
  });

  it("checks the first and the last day too", () => {
    const span = changeableDays("2026-11-10", "2026-11-13");

    expect(firstUnavailableIn(span, taken("2026-11-10"))).toBe("2026-11-10");
    expect(firstUnavailableIn(span, taken("2026-11-13"))).toBe("2026-11-13");
    expect(firstUnavailableIn(span, taken("2026-11-14"))).toBeUndefined();
  });

  it("leaves out the days a locked month keeps", () => {
    const lockedOctober = {
      from: "2026-10-28",
      to: "2026-10-31",
      startOpen: false,
      endOpen: true,
    };
    const isUnavailable = (date: string) =>
      date <= "2026-10-31" || date === "2026-11-04";

    expect(
      firstUnavailableIn(
        changeableDays("2026-10-28", "2026-11-03", lockedOctober),
        isUnavailable,
      ),
    ).toBeUndefined();
    expect(
      firstUnavailableIn(
        changeableDays("2026-10-28", "2026-11-05", lockedOctober),
        isUnavailable,
      ),
    ).toBe("2026-11-04");
  });
});

describe("partDayError", () => {
  const day = { workingMinutes: 480, loggedMinutes: 360 };

  it("accepts hours within what the logged time leaves", () => {
    expect(
      partDayError({ ...day, minutes: 120, isMeasuredAgainstLogged: true }),
    ).toBeUndefined();
  });

  it("refuses more than is left, naming what is", () => {
    expect(
      partDayError({ ...day, minutes: 180, isMeasuredAgainstLogged: true }),
    ).toBe("Only 2h of this day is left: 6h is already logged.");
  });

  it("doesn't measure hours that didn't grow against time logged since", () => {
    expect(
      partDayError({ ...day, minutes: 180, isMeasuredAgainstLogged: false }),
    ).toBeUndefined();
  });

  it("refuses a part as long as the day, no hours, and a day without any", () => {
    expect(
      partDayError({ ...day, minutes: 480, isMeasuredAgainstLogged: true }),
    ).toMatch(/Choose Whole day instead/);
    expect(
      partDayError({ ...day, minutes: 0, isMeasuredAgainstLogged: true }),
    ).toBe("Enter the hours away");
    expect(
      partDayError({
        workingMinutes: 0,
        loggedMinutes: 0,
        minutes: 60,
        isMeasuredAgainstLogged: true,
      }),
    ).toBe("This day has no working hours.");
  });
});
