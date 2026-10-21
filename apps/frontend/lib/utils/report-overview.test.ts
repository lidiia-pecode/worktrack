import { describe, expect, it } from "vitest";

import { HoursReportRow, PeopleReportRow } from "@/types";

import {
  groupProjectsByClient,
  isCloseToPlan,
  markerPercent,
  REFERENCE_PERCENT,
  sortPeople,
  targetBarGeometry,
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
  loggedMinutes: loggedHours * HOUR,
  billableMinutes: 0,
  nonBillableMinutes: loggedHours * HOUR,
  plannedMinutes: plannedHours * HOUR,
  expectedMinutes: expectedHours * HOUR,
  timeOffDays: 0,
  daysWithoutTime: [],
});

describe("targetBarGeometry", () => {
  it("fills up to the reference, which sits at two thirds", () => {
    expect(REFERENCE_PERCENT).toBeCloseTo(66.67, 1);
    expect(targetBarGeometry(75, 100)).toEqual({
      filledPercent: 50,
      pastPercent: 0,
      isCapped: false,
    });
  });

  it("goes on past the reference, and stops at half as much again", () => {
    const past = targetBarGeometry(125, 100)!;
    expect(past.filledPercent).toBeCloseTo(REFERENCE_PERCENT);
    expect(past.pastPercent).toBeCloseTo(REFERENCE_PERCENT / 4);
    expect(past.isCapped).toBe(false);
    const capped = targetBarGeometry(300, 100)!;
    expect(capped.filledPercent + capped.pastPercent).toBeCloseTo(100);
    expect(capped.isCapped).toBe(true);
  });

  it("draws nothing without a reference", () => {
    expect(targetBarGeometry(60, 0)).toBeNull();
  });

  it("places a marker on the same scale", () => {
    expect(markerPercent(100, 100)).toBeCloseTo(REFERENCE_PERCENT);
    expect(markerPercent(500, 100)).toBe(100);
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

  it("sorts by logged or planned against expected, nothing expected last", () => {
    expect(sortPeople(people, "logged").map((row) => row.name)).toEqual([
      "Abel",
      "Cara",
      "Bea",
    ]);
    expect(sortPeople(people, "planned").map((row) => row.name)).toEqual([
      "Cara",
      "Abel",
      "Bea",
    ]);
  });
});
