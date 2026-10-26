import { describe, expect, it } from "vitest";

import { HoursReportRow, PeopleReportRow } from "@/types";
import { UserRole } from "@/types/enums";

import { formatDayMonthLabel } from "./date";
import { lastCheckedDay, reportAttention } from "./report-attention";

const HOUR = 60;

const project = (
  name: string,
  loggedHours: number,
  plannedHours: number,
  client: string | null = "Retail Corp",
): HoursReportRow => ({
  id: name,
  name,
  detail: client,
  billableMinutes: loggedHours * HOUR,
  nonBillableMinutes: 0,
  totalMinutes: loggedHours * HOUR,
  plannedMinutes: plannedHours * HOUR,
});

const person = (
  name: string,
  figures: Partial<PeopleReportRow> = {},
): PeopleReportRow => ({
  userId: name,
  name,
  position: null,
  role: UserRole.EMPLOYEE,
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

type Input = Partial<Parameters<typeof reportAttention>[0]>;

/** A finished month by default: every day counts, no manager wording. */
const attention = (input: Input) =>
  reportAttention({
    people: [],
    projects: [],
    countedUntil: null,
    isManager: false,
    ...input,
  });

const factOf = (kind: string, input: Input) =>
  attention(input).facts.find((fact) => fact.kind === kind);

describe("reportAttention", () => {
  it("has nothing to say about a month on plan", () => {
    expect(
      attention({
        people: [person("Ava Mitchell", { loggedMinutes: 100 * HOUR })],
        projects: [project("Mobile App", 100, 100)],
      }).facts,
    ).toEqual([]);
  });

  it("puts missing time first, then projects, and leaves plans beyond hours to Planning", () => {
    const facts = attention({
      people: [
        person("Ethan Brooks", { plannedMinutes: 130 * HOUR }),
        person("Liam Carter", { daysWithoutTime: ["2026-10-02"] }),
      ],
      projects: [project("CRM System", 50, 20)],
    }).facts;

    expect(facts.map((fact) => fact.kind)).toEqual([
      "daysWithoutTime",
      "projectsOffPlan",
    ]);
  });

  describe("the last day missing time is checked", () => {
    it("is the last Friday on or before the last counted day", () => {
      // 2026-10-23 is a Friday.
      expect(lastCheckedDay("2026-10-22")).toBe("2026-10-16"); // today Friday
      expect(lastCheckedDay("2026-10-23")).toBe("2026-10-23"); // today Saturday
      expect(lastCheckedDay("2026-10-24")).toBe("2026-10-23"); // today Sunday
      expect(lastCheckedDay("2026-10-25")).toBe("2026-10-23"); // today Monday
    });
  });

  describe("days with no time", () => {
    it("names one person and their days", () => {
      const days = ["2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23"];
      const fact = factOf("daysWithoutTime", {
        people: [person("Liam Carter", { daysWithoutTime: days })],
      });

      expect(fact).toEqual({
        kind: "daysWithoutTime",
        subject: { id: "Liam Carter", label: "Liam Carter" },
        headline: "has 4 days with no time logged",
        note: undefined,
        detail: `${days.slice(0, 3).map(formatDayMonthLabel).join(", ")} and 1 more`,
        items: [],
      });
    });

    it("never names an owner, though their own month counts their days", () => {
      const fact = factOf("daysWithoutTime", {
        people: [
          person("Olivia Owner", {
            role: UserRole.OWNER,
            daysWithoutTime: ["2026-10-02"],
          }),
        ],
      });

      expect(fact).toBeUndefined();
    });

    it("lists several people, most days first", () => {
      const fact = factOf("daysWithoutTime", {
        people: [
          person("Noah Turner", { daysWithoutTime: ["2026-10-01"] }),
          person("Samuel Bell", {
            daysWithoutTime: ["2026-10-12", "2026-10-13"],
          }),
          person("Liam Carter", { daysWithoutTime: ["2026-10-02"] }),
        ],
      });

      expect(fact?.headline).toBe("3 people have days with no time logged");
      expect(fact?.subject).toBeUndefined();
      expect(fact?.items).toEqual([
        { id: "Samuel Bell", label: "Samuel Bell · 2" },
        { id: "Liam Carter", label: "Liam Carter · 1" },
        { id: "Noah Turner", label: "Noah Turner · 1" },
      ]);
    });

    it("leaves out a week that hasn't ended while the month runs, and says up to when", () => {
      const result = attention({
        people: [
          person("Liam Carter", {
            daysWithoutTime: ["2026-10-14", "2026-10-20", "2026-10-21"],
          }),
          person("Noah Turner", { daysWithoutTime: ["2026-10-19"] }),
        ],
        countedUntil: "2026-10-22", // today is Friday 23 October
      });

      expect(result.facts).toEqual([
        expect.objectContaining({
          headline: "has 1 day with no time logged",
          note: `up to ${formatDayMonthLabel("2026-10-16")}`,
          detail: formatDayMonthLabel("2026-10-14"),
        }),
      ]);
      expect([...result.people.entries()]).toEqual([
        ["Liam Carter", "1 day with no time logged"],
      ]);
    });

    it("has nothing to check before the month's first week ends", () => {
      expect(
        attention({
          people: [person("Liam Carter", { daysWithoutTime: ["2026-10-01"] })],
          countedUntil: "2026-10-01", // a Thursday, the month's first day
        }).facts,
      ).toEqual([]);
    });

    it("counts every day of a finished month, its last week too", () => {
      // September 2026 ends on a Wednesday.
      const fact = factOf("daysWithoutTime", {
        people: [
          person("Liam Carter", {
            daysWithoutTime: ["2026-09-29", "2026-09-30"],
          }),
        ],
      });

      expect(fact?.headline).toBe("has 2 days with no time logged");
      expect(fact?.note).toBeUndefined();
    });
  });

  describe("projects off plan", () => {
    it("flags a gap of at least 8h and over 10%, either way, in a finished month", () => {
      const flagged = (logged: number, planned: number) =>
        Boolean(
          factOf("projectsOffPlan", {
            projects: [project("A", logged, planned)],
          }),
        );

      expect(flagged(108, 100)).toBe(false); // 8h but only 8%
      expect(flagged(111, 100)).toBe(true); // 11h and 11%
      expect(flagged(27, 20)).toBe(false); // 35% but under 8h
      expect(flagged(28, 20)).toBe(true);
      expect(flagged(89, 100)).toBe(true); // under the plan too
    });

    it("flags only time over the plan while the month runs", () => {
      const projects = [project("Over", 120, 100), project("Under", 50, 100)];
      const result = attention({ projects, countedUntil: "2026-10-22" });

      expect([...result.projects.keys()]).toEqual(["Over"]);
    });

    it("flags unplanned time from 8h on a client project, never on an internal one", () => {
      expect(
        factOf("projectsOffPlan", { projects: [project("A", 7, 0)] }),
      ).toBeUndefined();
      expect(
        factOf("projectsOffPlan", {
          projects: [project("Support Desk", 193, 0, null)],
        }),
      ).toBeUndefined();
      expect(
        factOf("projectsOffPlan", { projects: [project("A", 8, 0)] }),
      ).toEqual({
        kind: "projectsOffPlan",
        subject: { id: "A", label: "A" },
        headline: "has 8h logged with no plan",
        note: undefined,
        detail: "Nothing was planned on it this month",
        items: [],
      });
    });

    it("lists several, largest gap first, and marks each", () => {
      const result = attention({
        projects: [
          project("CRM System", 139, 88),
          project("Customer Portal", 193, 0),
          project("Energy Usage Dashboard", 153, 216),
          project("Mobile App", 50, 50),
        ],
      });
      const fact = result.facts[0];

      expect(fact.headline).toBe("3 projects are off plan or not planned");
      expect(fact.items.map((item) => item.label)).toEqual([
        "Customer Portal · 193h with no plan",
        "Energy Usage Dashboard · −63h",
        "CRM System · +51h",
      ]);
      expect(result.projects.get("Customer Portal")).toBe(
        "Logged with no plan",
      );
      expect(result.projects.get("CRM System")).toBe("More than 10% off plan");
      expect(result.projects.has("Mobile App")).toBe(false);
    });

    it("says only off plan when every project has a plan", () => {
      const fact = factOf("projectsOffPlan", {
        projects: [
          project("CRM System", 139, 88),
          project("Mobile App", 30, 50),
        ],
      });

      expect(fact?.headline).toBe("2 projects are more than 10% off plan");
    });

    it("tells a manager the figures are their teams' share", () => {
      expect(
        factOf("projectsOffPlan", {
          projects: [project("CRM System", 139, 88)],
          isManager: true,
        })?.note,
      ).toBe("your teams' share");
    });
  });

  it("never names someone for a plan beyond their hours or for logging less than expected", () => {
    const result = attention({
      people: [
        person("Ethan Brooks", {
          plannedMinutes: 130 * HOUR,
          expectedMinutes: 96 * HOUR,
        }),
        person("Mia Collins", { loggedMinutes: 10 * HOUR }),
      ],
    });

    expect(result.facts).toEqual([]);
    expect(result.people.size).toBe(0);
  });
});
