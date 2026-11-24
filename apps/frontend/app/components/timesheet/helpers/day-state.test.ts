import { describe, expect, it } from "vitest";

import { Absence, PlanningEntry } from "@/types";
import { AbsenceType } from "@/types/enums";

import { dayActions } from "./day-state";

const WEDNESDAY = new Date(2026, 10, 18);

const absence = (minutes: number | null) =>
  ({
    id: "absence-1",
    type: AbsenceType.VACATION,
    startDate: "2026-11-18",
    endDate: "2026-11-18",
    minutes,
  }) as Absence;

const actionsWith = (away: Absence) =>
  dayActions({
    date: WEDNESDAY,
    absence: away,
    isAbsenceLocked: false,
    isEditable: true,
    canLogTime: true,
    timelogs: [],
    plannedEntries: [{ id: "plan-1" } as PlanningEntry],
  });

describe("dayActions", () => {
  it("keeps a partly absent day a working day: it takes time and shows its plans", () => {
    expect(actionsWith(absence(145))).toMatchObject({
      opensAbsence: true,
      canAddEntry: true,
      showsPlan: true,
    });
  });

  it("takes no time and shows no plans on a day away whole", () => {
    expect(actionsWith(absence(null))).toMatchObject({
      opensAbsence: true,
      canAddEntry: false,
      showsPlan: false,
    });
  });
});
