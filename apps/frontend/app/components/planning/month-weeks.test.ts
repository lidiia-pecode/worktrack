import { describe, expect, it } from "vitest";

import { WeekDay } from "@/types/enums";
import { toISODate } from "@/lib/utils/date";

import { monthWorkingWeeks } from "./month-weeks";

const asDays = (weeks: Date[][]) =>
  weeks.map((week) => week.map((day) => toISODate(day).slice(8)));

describe("monthWorkingWeeks", () => {
  it("splits a month that starts on a Sunday and ends on a Monday", () => {
    expect(asDays(monthWorkingWeeks("2026-11", WeekDay.MONDAY))).toEqual([
      ["02", "03", "04", "05", "06"],
      ["09", "10", "11", "12", "13"],
      ["16", "17", "18", "19", "20"],
      ["23", "24", "25", "26", "27"],
      ["30"],
    ]);
  });

  it("keeps the edge weeks short in a month starting mid-week", () => {
    expect(asDays(monthWorkingWeeks("2026-10", WeekDay.MONDAY))).toEqual([
      ["01", "02"],
      ["05", "06", "07", "08", "09"],
      ["12", "13", "14", "15", "16"],
      ["19", "20", "21", "22", "23"],
      ["26", "27", "28", "29", "30"],
    ]);
  });
});
