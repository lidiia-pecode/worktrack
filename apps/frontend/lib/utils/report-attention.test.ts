import { describe, expect, it } from "vitest";

import { HoursReportRow, PeopleReportRow } from "@/types";

import { attentionItems } from "./report-attention";

const HOUR = 60;
const STANDARD_DAY = 8 * HOUR;

const project = (
  name: string,
  loggedHours: number,
  plannedHours: number,
): HoursReportRow => ({
  id: name,
  name,
  detail: "Retail Corp",
  billableMinutes: loggedHours * HOUR,
  nonBillableMinutes: 0,
  totalMinutes: loggedHours * HOUR,
  plannedMinutes: plannedHours * HOUR,
  peopleCount: 3,
});

const person = (
  name: string,
  figures: Partial<PeopleReportRow> = {},
): PeopleReportRow => ({
  userId: name,
  name,
  position: null,
  loggedMinutes: 0,
  billableMinutes: 0,
  nonBillableMinutes: 0,
  plannedMinutes: 0,
  expectedMinutes: 100 * HOUR,
  timeOffDays: 0,
  daysWithoutTime: [],
  ...figures,
});

const kindsFor = (people: PeopleReportRow[], projects: HoursReportRow[]) =>
  attentionItems(people, projects, STANDARD_DAY).map((item) => [
    item.who,
    item.kind,
  ]);

describe("attentionItems", () => {
  it("flags a project off its plan by at least 8h and over a tenth", () => {
    expect(
      kindsFor(
        [],
        [
          project("Over", 120, 100), // +20h, 20%
          project("Under", 10, 100), // −90h
          project("Small", 107, 100), // +7h: under 8h
          project("Big but close", 560, 520), // +40h, under 10%
        ],
      ),
    ).toEqual([
      ["Under", "projectOffPlan"],
      ["Over", "projectOffPlan"],
    ]);
  });

  it("says how a project is off its plan", () => {
    const [under, over] = attentionItems(
      [],
      [project("Over", 120, 100), project("Under", 10, 100)],
      STANDARD_DAY,
    );

    expect(under.what).toBe("has 10h logged of 100h planned");
    expect(over.what).toBe("has 20h more logged than planned");
    expect(over.why).toBe("Retail Corp · 3 people");
  });

  it("flags time logged with no plan, from 8h", () => {
    expect(
      kindsFor([], [project("Unplanned", 8, 0), project("Tiny", 7, 0)]),
    ).toEqual([["Unplanned", "projectWithoutPlan"]]);
  });

  it("flags somebody planned beyond what they are expected to work", () => {
    const [item] = attentionItems(
      [
        person("Ethan Brooks", {
          plannedMinutes: 96 * HOUR,
          expectedMinutes: 72 * HOUR,
          timeOffDays: 5,
        }),
        person("Close", { plannedMinutes: 105 * HOUR }),
      ],
      [],
      STANDARD_DAY,
    );

    expect(item).toMatchObject({
      kind: "plannedBeyondExpected",
      who: "Ethan Brooks",
      what: "is planned for 96h but expected to work 72h",
      why: "5 days off leave less room than the plan assumes",
    });
  });

  it("names the days somebody logged nothing on", () => {
    const [item] = attentionItems(
      [
        person("Liam Carter", {
          daysWithoutTime: ["2026-10-15", "2026-10-16", "2026-10-19"],
        }),
      ],
      [],
      STANDARD_DAY,
    );

    expect(item.what).toBe("has 3 working days with no time logged");
    expect(item.why).toMatch(/ and .+\. Worth checking before you invoice\.$/);
  });

  it("gathers several people's missing days into one item, so other facts stay in view", () => {
    const missing = (days: number) =>
      Array.from({ length: days }, (_, i) => `2026-10-${10 + i}`);
    const items = attentionItems(
      ["Ava Mitchell", "Ethan Brooks", "Liam Carter", "Mia Collins"].map(
        (name, i) => person(name, { daysWithoutTime: missing(10 - i) }),
      ),
      [project("Over", 120, 100)],
      STANDARD_DAY,
    );

    expect(items.map((item) => item.kind)).toEqual([
      "teamDaysWithoutTime",
      "projectOffPlan",
    ]);
    expect(items[0]).toMatchObject({
      who: "4 people",
      what: "have 34 working days with no time logged between them",
      why: "Ava Mitchell (10), Ethan Brooks (9), Liam Carter (8) and 1 more. Worth checking before you invoice.",
    });
  });

  it("never flags somebody for logging less than expected", () => {
    expect(
      kindsFor([person("Grace Morgan", { loggedMinutes: 10 * HOUR })], []),
    ).toEqual([]);
  });

  it("puts the largest first and keeps every fact", () => {
    const projects = [10, 20, 30, 40, 50, 60].map((gap) =>
      project(`Project ${gap}`, 100 + gap, 100),
    );
    const items = attentionItems(
      [person("Liam Carter", { daysWithoutTime: ["2026-10-15"] })],
      projects,
      STANDARD_DAY,
    );

    // Project 10 is exactly a tenth off, so it is left out.
    expect(items.map((item) => item.minutes)).toEqual(
      [60, 50, 40, 30, 20, 8].map((hours) => hours * HOUR),
    );
  });
});
