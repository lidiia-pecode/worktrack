import { describe, expect, it } from "vitest";

import { PlanningWeekRow, TeamSummaryRow } from "@/types";
import { UserStatus } from "@/types/enums";

import {
  DEFAULT_TEAM_SORT,
  nextTeamSort,
  searchTeamRows,
  sortPlanningRows,
  sortTeamRows,
} from "./team-rows";

const row = (
  firstName: string,
  minutes: number,
  expectedToDateMinutes: number,
  position = "Developer",
): TeamSummaryRow => ({
  user: {
    id: `user-${firstName.toLowerCase()}`,
    firstName,
    lastName: "Taylor",
    email: `${firstName.toLowerCase()}@example.com`,
    position,
    status: UserStatus.ACTIVE,
    lastWorkingDay: null,
  },
  minutes,
  billableMinutes: minutes,
  nonBillableMinutes: 0,
  expectedMinutes: expectedToDateMinutes,
  expectedToDateMinutes,
  closedSpells: [],
  moves: [],
  expectedByDate: [],
  days: [],
});

// Ava 35h of 40h, Jane 24h of 24h (a part-timer), Mia nothing expected.
const AVA = row("Ava", 2100, 2400);
const JANE = row("Jane", 1440, 1440, "Designer");
const MIA = row("Mia", 600, 0);
const names = (rows: TeamSummaryRow[]) =>
  rows.map((each) => each.user.firstName);

describe("sortTeamRows", () => {
  it("sorts by name, A to Z and back", () => {
    const rows = [MIA, JANE, AVA];

    expect(
      names(sortTeamRows(rows, DEFAULT_TEAM_SORT, { byProject: false })),
    ).toEqual(["Ava", "Jane", "Mia"]);
    expect(
      names(
        sortTeamRows(
          rows,
          { key: "name", direction: "desc" },
          { byProject: false },
        ),
      ),
    ).toEqual(["Mia", "Jane", "Ava"]);
  });

  it("sorts by the share of what was expected, least complete first", () => {
    const sorted = sortTeamRows(
      [JANE, AVA],
      { key: "total", direction: "asc" },
      { byProject: false },
    );

    expect(names(sorted)).toEqual(["Ava", "Jane"]);
  });

  it("puts someone expected nothing last in either direction", () => {
    for (const direction of ["asc", "desc"] as const) {
      const sorted = sortTeamRows(
        [MIA, JANE, AVA],
        { key: "total", direction },
        { byProject: false },
      );

      expect(names(sorted).at(-1)).toBe("Mia");
    }
  });

  it("sorts by minutes on the project under a project filter", () => {
    const sorted = sortTeamRows(
      [AVA, MIA, JANE],
      { key: "total", direction: "desc" },
      { byProject: true },
    );

    expect(names(sorted)).toEqual(["Ava", "Jane", "Mia"]);
  });
});

describe("sortPlanningRows", () => {
  const planned = (
    teamRow: TeamSummaryRow,
    plannedMinutes: number,
    availableMinutes: number,
  ) =>
    ({
      user: teamRow.user,
      plannedMinutes,
      availableMinutes,
    }) as PlanningWeekRow;

  // Ava 30h of 40h, Jane 20h of 20h (a part-timer), Mia nothing available.
  const rows = [
    planned(MIA, 0, 0),
    planned(JANE, 1200, 1200),
    planned(AVA, 1800, 2400),
  ];

  it("compares the share of what is available, nobody available last", () => {
    const sorted = (direction: "asc" | "desc") =>
      sortPlanningRows(
        rows,
        { key: "total", direction },
        { byProject: false },
      ).map((row) => row.user.firstName);

    expect(sorted("asc")).toEqual(["Ava", "Jane", "Mia"]);
    expect(sorted("desc")).toEqual(["Jane", "Ava", "Mia"]);
  });
});

describe("nextTeamSort", () => {
  it("reverses the sorted button and starts another ascending", () => {
    expect(nextTeamSort(DEFAULT_TEAM_SORT, "name")).toEqual({
      key: "name",
      direction: "desc",
    });
    expect(nextTeamSort({ key: "name", direction: "desc" }, "total")).toEqual({
      key: "total",
      direction: "asc",
    });
  });
});

describe("searchTeamRows", () => {
  it("finds people by name or position, ignoring case", () => {
    const rows = [AVA, JANE, MIA];

    expect(names(searchTeamRows(rows, "  ava "))).toEqual(["Ava"]);
    expect(names(searchTeamRows(rows, "DESIGN"))).toEqual(["Jane"]);
    expect(searchTeamRows(rows, "")).toBe(rows);
  });
});
