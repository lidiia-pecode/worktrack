import { describe, expect, it } from "vitest";

import { Absence } from "@/types";
import { AbsenceType } from "@/types/enums";

import { mapAbsencesByDate, mapAbsencesByUserAndDate } from "./absence";

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
