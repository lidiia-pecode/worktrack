import { describe, expect, it } from "vitest";

import { HoursReportRow, PeopleReportRow } from "@/types";

import { formatDayMonthLabel } from "./date";
import { attentionFacts } from "./report-attention";

const HOUR = 60;

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
  teams: [],
  loggedMinutes: 0,
  billableMinutes: 0,
  nonBillableMinutes: 0,
  plannedMinutes: 0,
  expectedMinutes: 100 * HOUR,
  timeOffDays: 0,
  daysWithoutTime: [],
  ...figures,
});

const factOf = (
  kind: string,
  people: PeopleReportRow[],
  projects: HoursReportRow[] = [],
) => attentionFacts(people, projects).find((fact) => fact.kind === kind);

describe("attentionFacts", () => {
  it("has nothing to say about a month on plan", () => {
    expect(
      attentionFacts(
        [person("Ava Mitchell", { loggedMinutes: 100 * HOUR })],
        [project("Mobile App", 100, 100)],
      ),
    ).toEqual([]);
  });

  it("puts missing time first, then projects, then plans beyond hours", () => {
    const facts = attentionFacts(
      [
        person("Ethan Brooks", { plannedMinutes: 130 * HOUR }),
        person("Liam Carter", { daysWithoutTime: ["2026-10-02"] }),
      ],
      [project("CRM System", 50, 20)],
    );

    expect(facts.map((fact) => fact.kind)).toEqual([
      "daysWithoutTime",
      "projectsOffPlan",
      "plannedBeyondHours",
    ]);
  });

  describe("days with no time", () => {
    it("names one person's days, and opens that person", () => {
      const days = ["2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23"];
      const fact = factOf("daysWithoutTime", [
        person("Liam Carter", { daysWithoutTime: days }),
      ]);

      expect(fact).toEqual({
        kind: "daysWithoutTime",
        headline: "Liam Carter has 4 days with no time logged",
        detail: `${days.slice(0, 3).map(formatDayMonthLabel).join(", ")} and 1 more`,
        subjectId: "Liam Carter",
      });
    });

    it("groups several people, most days first, with no single person to open", () => {
      const fact = factOf("daysWithoutTime", [
        person("Noah Turner", { daysWithoutTime: ["2026-10-01"] }),
        person("Samuel Bell", {
          daysWithoutTime: ["2026-10-12", "2026-10-13"],
        }),
        person("Liam Carter", { daysWithoutTime: ["2026-10-02"] }),
        person("Mark Nobody", { daysWithoutTime: ["2026-10-21"] }),
      ]);

      expect(fact?.headline).toBe("4 people have days with no time logged");
      expect(fact?.detail).toBe(
        "Samuel Bell · 2, Liam Carter · 1, Mark Nobody · 1 and 1 more",
      );
      expect(fact?.subjectId).toBeUndefined();
    });
  });

  describe("projects off plan", () => {
    it("flags a gap of at least 8h and over 10%, either way, and no other", () => {
      const flagged = (logged: number, planned: number) =>
        Boolean(factOf("projectsOffPlan", [], [project("A", logged, planned)]));

      expect(flagged(108, 100)).toBe(false); // 8h but only 8%
      expect(flagged(111, 100)).toBe(true); // 11h and 11%
      expect(flagged(27, 20)).toBe(false); // 35% but under 8h
      expect(flagged(28, 20)).toBe(true);
      expect(flagged(89, 100)).toBe(true); // under the plan too
    });

    it("counts time with no plan from 8h", () => {
      expect(factOf("projectsOffPlan", [], [project("A", 7, 0)])).toBe(
        undefined,
      );
      expect(factOf("projectsOffPlan", [], [project("A", 8, 0)])).toEqual({
        kind: "projectsOffPlan",
        headline: "A is more than 10% off plan",
        detail: "8h logged with no plan",
        subjectId: "A",
      });
    });

    it("counts several and names the two largest gaps", () => {
      const fact = factOf(
        "projectsOffPlan",
        [],
        [
          project("CRM System", 139, 88),
          project("Support Desk", 193, 0),
          project("Energy Usage Dashboard", 153, 216),
          project("Mobile App", 50, 50),
        ],
      );

      expect(fact?.headline).toBe("3 projects are more than 10% off plan");
      expect(fact?.detail).toBe(
        "Largest: Support Desk, 193h with no plan · Energy Usage Dashboard −63h",
      );
      expect(fact?.subjectId).toBeUndefined();
    });
  });

  describe("planned beyond their hours", () => {
    it("flags a plan beyond expected hours, never logging less than expected", () => {
      const people = [
        person("Ethan Brooks", {
          plannedMinutes: 120 * HOUR,
          expectedMinutes: 96 * HOUR,
        }),
        person("Mia Collins", {
          loggedMinutes: 10 * HOUR,
          plannedMinutes: 100 * HOUR,
        }),
      ];

      expect(attentionFacts(people, [])).toEqual([
        {
          kind: "plannedBeyondHours",
          headline: "Ethan Brooks is planned beyond their hours",
          detail: "120h planned, 96h expected",
          subjectId: "Ethan Brooks",
        },
      ]);
    });

    it("groups several people by name", () => {
      const overPlanned = { plannedMinutes: 130 * HOUR };
      const fact = factOf("plannedBeyondHours", [
        person("Ethan Brooks", overPlanned),
        person("Lucas Reed", overPlanned),
      ]);

      expect(fact?.headline).toBe("2 people are planned beyond their hours");
      expect(fact?.detail).toBe("Ethan Brooks and Lucas Reed");
    });
  });
});
