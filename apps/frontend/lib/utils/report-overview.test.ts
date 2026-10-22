import { describe, expect, it } from "vitest";

import { HoursReportRow, PeopleReportRow } from "@/types";

import {
  barMarks,
  describeAgainstPlan,
  groupProjectsByClient,
  hourScale,
  isCloseToPlan,
  personDays,
  sortPeople,
} from "./report-overview";

const HOUR = 60;

const project = (
  name: string,
  client: string | null,
  loggedHours: number,
  plannedHours: number,
): HoursReportRow => ({
  id: name,
  name,
  detail: client,
  billableMinutes: client ? loggedHours * HOUR : 0,
  nonBillableMinutes: client ? 0 : loggedHours * HOUR,
  totalMinutes: loggedHours * HOUR,
  plannedMinutes: plannedHours * HOUR,
  peopleCount: 1,
});

const person = (
  name: string,
  loggedHours: number,
  plannedHours: number,
  expectedHours: number,
): PeopleReportRow => ({
  userId: name,
  name,
  position: null,
  teams: [],
  loggedMinutes: loggedHours * HOUR,
  billableMinutes: 0,
  nonBillableMinutes: loggedHours * HOUR,
  plannedMinutes: plannedHours * HOUR,
  expectedMinutes: expectedHours * HOUR,
  timeOffDays: 0,
  daysWithoutTime: [],
});

describe("hourScale", () => {
  it("ends on a round number just above the largest figure, in a few even steps", () => {
    expect(hourScale(114.5 * HOUR)).toEqual({
      endMinutes: 120 * HOUR,
      ticks: [0, 40, 80, 120].map((hours) => hours * HOUR),
    });
    expect(hourScale(394 * HOUR).ticks).toEqual(
      [0, 100, 200, 300, 400].map((hours) => hours * HOUR),
    );
  });

  it("keeps to fewer steps for a narrow list", () => {
    expect(hourScale(18.5 * HOUR, 2).ticks).toEqual(
      [0, 10, 20].map((hours) => hours * HOUR),
    );
  });

  it("still draws a scale when everything is zero", () => {
    expect(hourScale(0).endMinutes).toBeGreaterThan(0);
  });
});

describe("barMarks", () => {
  const scale = hourScale(120 * HOUR);
  const marks = (
    logged: number,
    expected?: number | null,
    planned?: number | null,
  ) =>
    barMarks(
      {
        logged: logged * HOUR,
        expected: expected && expected * HOUR,
        planned: planned && planned * HOUR,
      },
      scale,
    );

  it("puts logged, expected and planned on the same scale", () => {
    expect(marks(90, 102, 96)).toEqual({
      loggedPercent: 75,
      pastPercent: 0,
      linePercent: 85,
      ringPercent: 80,
    });
  });

  it("stripes the time logged past expected", () => {
    expect(marks(114, 102, 102)).toMatchObject({
      loggedPercent: 85,
      pastPercent: 10,
    });
  });

  it("stripes a project's time past its plan, with no line", () => {
    expect(marks(108, null, 96)).toEqual({
      loggedPercent: 80,
      pastPercent: 10,
      linePercent: null,
      ringPercent: 80,
    });
  });

  it("keeps the line and ring when nothing was logged", () => {
    expect(marks(0, 108, 60)).toEqual({
      loggedPercent: 0,
      pastPercent: 0,
      linePercent: 90,
      ringPercent: 50,
    });
  });

  it("draws no mark for what is missing, never one at zero", () => {
    expect(marks(6, 0, 0)).toEqual({
      loggedPercent: 5,
      pastPercent: 0,
      linePercent: null,
      ringPercent: null,
    });
  });
});

describe("describeAgainstPlan", () => {
  it("says the plan and the gap, or that there was no plan", () => {
    expect(describeAgainstPlan(project("A", "Acme", 226, 210))).toBe(
      "210h planned · +16h",
    );
    expect(describeAgainstPlan(project("B", "Acme", 46, 0))).toBe(
      "not planned",
    );
  });
});

describe("isCloseToPlan", () => {
  it("counts a project within a tenth of its plan, either way", () => {
    expect(isCloseToPlan(project("A", "Acme", 90, 100))).toBe(true);
    expect(isCloseToPlan(project("B", "Acme", 110, 100))).toBe(true);
    expect(isCloseToPlan(project("C", "Acme", 89, 100))).toBe(false);
  });

  it("never counts a project with no plan", () => {
    expect(isCloseToPlan(project("D", "Acme", 0, 0))).toBe(false);
  });
});

describe("groupProjectsByClient", () => {
  it("puts projects under one client whatever the case, with the capitals", () => {
    const [acme] = groupProjectsByClient([
      project("CRM", "acme", 10, 0),
      project("Portal", "Acme", 5, 0),
    ]);

    expect(acme).toMatchObject({ name: "Acme", loggedMinutes: 15 * HOUR });
    expect(acme.projects.map((row) => row.name)).toEqual(["CRM", "Portal"]);
  });

  it("orders clients by logged time, with internal work last", () => {
    const groups = groupProjectsByClient([
      project("WorkTrack", null, 400, 0),
      project("CRM", "Fintech", 50, 0),
      project("Mobile", "Retail", 200, 0),
    ]);

    expect(groups.map((group) => group.name)).toEqual([
      "Retail",
      "Fintech",
      null,
    ]);
  });
});

describe("sortPeople", () => {
  const people = [
    person("Cara", 50, 120, 100),
    person("Abel", 110, 40, 100),
    person("Bea", 0, 0, 0),
  ];

  it("sorts by name", () => {
    expect(sortPeople(people, "name").map((row) => row.name)).toEqual([
      "Abel",
      "Bea",
      "Cara",
    ]);
  });

  it("puts the largest share of expected hours logged first, nothing expected last", () => {
    expect(sortPeople(people, "logged").map((row) => row.name)).toEqual([
      "Abel",
      "Cara",
      "Bea",
    ]);
  });
});

describe("personDays", () => {
  // 5–9 October 2026 is Monday to Friday; the 10th and 11th are a weekend.
  const input = {
    dateFrom: "2026-10-05",
    dateTo: "2026-10-11",
    countedUntil: null,
    loggedByDate: new Map([
      ["2026-10-05", 480],
      ["2026-10-11", 60],
    ]),
    isOff: (date: string) => date === "2026-10-06",
    daysWithoutTime: new Set(["2026-10-07"]),
  };

  it("marks each working day, and a weekend only when time was logged", () => {
    expect(personDays(input).map((day) => [day.date, day.kind])).toEqual([
      ["2026-10-05", "logged"],
      ["2026-10-06", "off"],
      ["2026-10-07", "withoutTime"],
      ["2026-10-08", "nothingExpected"],
      ["2026-10-09", "nothingExpected"],
      ["2026-10-11", "logged"],
    ]);
  });

  it("stops at the last counted day, then shows today", () => {
    const days = personDays({ ...input, countedUntil: "2026-10-07" });

    expect(days.map((day) => [day.date, day.kind])).toEqual([
      ["2026-10-05", "logged"],
      ["2026-10-06", "off"],
      ["2026-10-07", "withoutTime"],
      ["2026-10-08", "today"],
    ]);
  });
});
