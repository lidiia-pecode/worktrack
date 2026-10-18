import { describe, expect, it } from "vitest";

import { Absence } from "@/types";
import { AbsenceType } from "@/types/enums";

import {
  mapAbsencesByDate,
  mapAbsencesByUserAndDate,
  newAbsenceStartDate,
} from "./absence";

const absence = (
  id: string,
  userId: string,
  startDate: string,
  endDate: string,
): Absence =>
  ({ id, userId, startDate, endDate, type: AbsenceType.VACATION }) as Absence;

const WEEK = [
  "2026-01-12",
  "2026-01-13",
  "2026-01-14",
  "2026-01-15",
  "2026-01-16",
];

describe("mapAbsencesByDate", () => {
  it("puts an absence on every day of its range, both ends included", () => {
    const trip = absence("trip", "ann", "2026-01-13", "2026-01-15");

    expect(mapAbsencesByDate([trip], WEEK)).toEqual({
      "2026-01-13": trip,
      "2026-01-14": trip,
      "2026-01-15": trip,
    });
  });

  it("leaves out the days of a range outside the dates asked for", () => {
    const long = absence("long", "ann", "2026-01-01", "2026-01-12");

    expect(mapAbsencesByDate([long], WEEK)).toEqual({ "2026-01-12": long });
  });

  it("gives nothing for days nobody is away", () => {
    expect(mapAbsencesByDate([], WEEK)).toEqual({});
  });
});

describe("mapAbsencesByUserAndDate", () => {
  it("keeps each person's absences apart", () => {
    const ann = absence("a", "ann", "2026-01-12", "2026-01-12");
    const bob = absence("b", "bob", "2026-01-12", "2026-01-13");

    expect(mapAbsencesByUserAndDate([ann, bob], WEEK)).toEqual({
      ann: { "2026-01-12": ann },
      bob: { "2026-01-12": bob, "2026-01-13": bob },
    });
  });
});

describe("newAbsenceStartDate", () => {
  const SATURDAY = new Date(2026, 9, 17);
  const WEDNESDAY = new Date(2026, 9, 14);
  const THIS_MONDAY = new Date(2026, 9, 12);
  const SEPTEMBER_MONDAY = new Date(2026, 8, 7);
  const everyDayOpen = () => true;

  it("starts on today in the current week", () => {
    expect(
      newAbsenceStartDate({
        today: WEDNESDAY,
        weekStart: THIS_MONDAY,
        isCurrentWeek: true,
        isEditable: everyDayOpen,
      }),
    ).toBe("2026-10-14");
  });

  it("moves a weekend on to the next working day", () => {
    expect(
      newAbsenceStartDate({
        today: SATURDAY,
        weekStart: THIS_MONDAY,
        isCurrentWeek: true,
        isEditable: everyDayOpen,
      }),
    ).toBe("2026-10-19");
  });

  it("starts on the shown week's first working day", () => {
    expect(
      newAbsenceStartDate({
        today: WEDNESDAY,
        weekStart: new Date(2026, 9, 25),
        isCurrentWeek: false,
        isEditable: everyDayOpen,
      }),
    ).toBe("2026-10-26");
  });

  it("falls back to today when the shown week is locked", () => {
    expect(
      newAbsenceStartDate({
        today: WEDNESDAY,
        weekStart: SEPTEMBER_MONDAY,
        isCurrentWeek: false,
        isEditable: (date) => date >= "2026-10-01",
      }),
    ).toBe("2026-10-14");
  });
});
