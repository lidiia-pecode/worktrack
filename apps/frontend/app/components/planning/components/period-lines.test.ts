import { describe, expect, it } from "vitest";

import { PlanningEntry } from "@/types";
import {
  formatDayMonthLabel,
  formatWeekdayLabel,
  fromISODate,
} from "@/lib/utils/date";

import {
  busiestDay,
  describeDays,
  listedChangeText,
  listedLines,
} from "./period-lines";

// November 2026: Monday the 2nd to Friday the 27th, four full weeks.
const WORKING_DAYS = [2, 9, 16, 23].flatMap((monday) =>
  [0, 1, 2, 3, 4].map(
    (offset) => `2026-11-${String(monday + offset).padStart(2, "0")}`,
  ),
);

const plan = (date: string, minutes: number, projectId = "support") =>
  ({
    id: `${projectId}-${date}`,
    userId: "user-anna",
    project: {
      id: projectId,
      name: projectId === "support" ? "Support" : "Website",
    },
    plannedMinutes: minutes,
    date,
  }) as PlanningEntry;

const lineOf = (plans: PlanningEntry[]) => listedLines(plans)[0];

const dayLabel = (date: string) =>
  `${formatWeekdayLabel(fromISODate(date))} ${formatDayMonthLabel(date)}`;

describe("describeDays", () => {
  it("names every working day only once the working days are known", () => {
    const everyDay = lineOf(WORKING_DAYS.map((d) => plan(d, 120)));

    expect(describeDays(everyDay, WORKING_DAYS)).toBe(
      "Every working day · 20 days",
    );
    expect(describeDays(everyDay, [])).toBe(
      `20 days, ${formatDayMonthLabel(WORKING_DAYS[0])} – ${formatDayMonthLabel(WORKING_DAYS[19])}`,
    );
  });

  it("names a few days, and sums up more", () => {
    const few = ["2026-11-03", "2026-11-11"];
    expect(
      describeDays(lineOf(few.map((d) => plan(d, 120))), WORKING_DAYS),
    ).toBe(`${few.map(dayLabel).join(", ")} · 2 days`);

    const many = WORKING_DAYS.slice(1, 7);
    expect(
      describeDays(lineOf(many.map((d) => plan(d, 120))), WORKING_DAYS),
    ).toBe(
      `6 days, ${formatDayMonthLabel(many[0])} – ${formatDayMonthLabel(many[5])}`,
    );
  });

  it("gives each day its hours when they differ, or their range", () => {
    expect(
      describeDays(
        lineOf([plan("2026-11-03", 60), plan("2026-11-11", 120)]),
        WORKING_DAYS,
      ),
    ).toBe(`${dayLabel("2026-11-03")} · 1h, ${dayLabel("2026-11-11")} · 2h`);

    expect(
      describeDays(
        lineOf(WORKING_DAYS.slice(0, 5).map((d, i) => plan(d, i ? 120 : 60))),
        WORKING_DAYS,
      ),
    ).toBe("5 days, 1h to 2h a day");
  });
});

describe("listedChangeText", () => {
  it("says what the save changes, with the hours it replaces", () => {
    const same = lineOf(["2026-11-02", "2026-11-09"].map((d) => plan(d, 120)));
    expect(listedChangeText(same, 180, 2)).toBe(
      "change Support from 2h to 3h on 2 days",
    );

    const differing = lineOf([
      plan("2026-11-03", 60),
      plan("2026-11-11", 120),
      plan("2026-11-19", 120),
    ]);
    expect(differing.commonMinutes).toBe(120);
    expect(listedChangeText(differing, 120, 1)).toBe(
      `set Support to 2h on ${["2026-11-03", "2026-11-11", "2026-11-19"].map(dayLabel).join(", ")} (was 1h, 2h, 2h)`,
    );
  });
});

describe("busiestDay", () => {
  it("applies edited and added hours to the plans already there", () => {
    const day = busiestDay({
      plannedDays: ["2026-11-02", "2026-11-03"],
      plans: [plan("2026-11-02", 120), plan("2026-11-03", 240, "website")],
      editedMinutes: new Map([["support", 300]]),
      added: [{ projectId: "design", minutes: 60 }],
    });

    expect(day).toEqual({
      minutes: 360,
      shares: [
        { projectId: "support", minutes: 300 },
        { projectId: "design", minutes: 60 },
      ],
      isSameEveryDay: false,
    });
  });
});
