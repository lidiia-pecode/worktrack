import { describe, expect, it } from "vitest";

import { PlanningEntry } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { planBars } from "./plan-bars";

const DAYS = [
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
];

const plan = (projectName: string, date: string, minutes: number) =>
  ({
    id: `${projectName}-${date}`,
    userId: "user-1",
    project: {
      id: projectName,
      name: projectName,
      status: ProjectStatus.ACTIVE,
    },
    plannedMinutes: minutes,
    date,
  }) as PlanningEntry;

const shape = (entries: PlanningEntry[]) =>
  planBars(entries, DAYS).map(({ project, start, length, minutes, lane }) => [
    project.name,
    start,
    length,
    minutes,
    lane,
  ]);

describe("planBars", () => {
  it("draws a steady week as one bar", () => {
    expect(shape(DAYS.map((day) => plan("Atlas", day, 480)))).toEqual([
      ["Atlas", 0, 5, 480, 0],
    ]);
  });

  it("ends a bar where the hours change or a day has no plan", () => {
    expect(
      shape([
        plan("Atlas", DAYS[0], 240),
        plan("Atlas", DAYS[1], 240),
        plan("Atlas", DAYS[2], 360),
        plan("Atlas", DAYS[4], 360),
      ]),
    ).toEqual([
      ["Atlas", 0, 2, 240, 0],
      ["Atlas", 2, 1, 360, 0],
      ["Atlas", 4, 1, 360, 0],
    ]);
  });

  it("keeps each project in its own lane, in name order", () => {
    expect(
      shape([
        plan("Zephyr", DAYS[0], 120),
        plan("Atlas", DAYS[0], 360),
        plan("Zephyr", DAYS[1], 120),
        plan("Atlas", DAYS[1], 360),
      ]),
    ).toEqual([
      ["Atlas", 0, 2, 360, 0],
      ["Zephyr", 0, 2, 120, 1],
    ]);
  });
});
