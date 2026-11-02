import { describe, expect, it } from "vitest";

import { PeopleReportRow } from "@/types";
import { UserRole, UserStatus } from "@/types/enums";

import { groupPeopleByTeam, periodChange, personDays } from "./report-overview";

const HOUR = 60;

const person = (
  name: string,
  loggedHours: number,
  plannedHours: number,
  expectedHours: number,
): PeopleReportRow => ({
  userId: name,
  name,
  position: null,
  role: UserRole.EMPLOYEE,
  status: UserStatus.ACTIVE,
  teams: [],
  loggedMinutes: loggedHours * HOUR,
  billableMinutes: 0,
  nonBillableMinutes: loggedHours * HOUR,
  plannedMinutes: plannedHours * HOUR,
  expectedMinutes: expectedHours * HOUR,
  timeOffDays: 0,
  daysWithoutTime: [],
});

describe("groupPeopleByTeam", () => {
  const team = (id: string) => ({ id, name: `${id} team` });
  const withTeams = (name: string, ...teams: string[]) => ({
    ...person(name, 10, 0, 20),
    teams: teams.map(team),
  });

  it("puts people under each of their teams, by team name, with no team last", () => {
    const groups = groupPeopleByTeam([
      withTeams("Emma Clarke", "Platform", "Core"),
      withTeams("Mark Nobody"),
      withTeams("Liam Carter", "Core"),
    ]);

    expect(
      groups.map((group) => [group.name, group.people.map((row) => row.name)]),
    ).toEqual([
      ["Core team", ["Emma Clarke", "Liam Carter"]],
      ["Platform team", ["Emma Clarke"]],
      ["No team", ["Mark Nobody"]],
    ]);
  });

  it("adds up each team's logged and expected hours", () => {
    const [core] = groupPeopleByTeam([
      withTeams("Emma Clarke", "Core"),
      withTeams("Liam Carter", "Core"),
    ]);

    expect(core).toMatchObject({
      loggedMinutes: 20 * HOUR,
      expectedMinutes: 40 * HOUR,
    });
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

  it("shows the whole period: today, then the days to come with what is already on them", () => {
    const days = personDays({
      ...input,
      countedUntil: "2026-10-06",
      isOff: (date: string) => date === "2026-10-09",
    });

    expect(days.map((day) => [day.date, day.kind, day.when])).toEqual([
      ["2026-10-05", "logged", "past"],
      ["2026-10-06", "nothingExpected", "past"],
      ["2026-10-07", "pending", "today"],
      ["2026-10-08", "pending", "future"],
      ["2026-10-09", "off", "future"],
      ["2026-10-11", "logged", "future"],
    ]);
  });
});

describe("periodChange", () => {
  const HOUR = 60;
  const figures = (
    logged: number,
    planned: number,
    billable: number,
    expected: number,
  ) => ({
    loggedMinutes: logged * HOUR,
    plannedMinutes: planned * HOUR,
    billableMinutes: billable * HOUR,
    expectedMinutes: expected * HOUR,
  });

  it("compares each share in points between the shares shown, with the hours behind it", () => {
    // 94% logged after 90%, 89% planned after 91%, 60% billable after 63%.
    const change = periodChange(
      figures(94, 89, 56.4, 100),
      figures(90, 91, 56.7, 100),
    );

    expect(change.logged).toEqual({ points: 4, minutes: 4 * HOUR });
    expect(change.planned).toEqual({ points: -2, minutes: -2 * HOUR });
    expect(change.billable?.points).toBe(-3);
  });

  it("has no change for a figure with nothing to measure it against in either period", () => {
    const change = periodChange(figures(10, 0, 0, 40), figures(0, 0, 0, 0));

    expect(change).toEqual({ logged: null, planned: null, billable: null });
  });
});
