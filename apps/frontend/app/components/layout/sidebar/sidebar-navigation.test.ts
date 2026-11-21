import { describe, expect, it } from "vitest";

import { UserRole } from "@/types/enums";

import {
  isActivePath,
  NavigationGroup,
  navigationFor,
  pageLabelFor,
} from "./sidebar-navigation";

const labelsOf = (groups: NavigationGroup[]) =>
  groups.map((group) => ({
    label: group.label,
    items: group.items.map((item) => item.label),
  }));

const TEAM = ["Team time", "Planning", "Reports"];
const MY_TIME = ["Log my time", "Review my time"];
const OWNER_MANAGE = [
  "People",
  "Teams",
  "Projects",
  "Activities",
  "Categories",
  "Periods",
];

describe("navigationFor", () => {
  it("gives an owner their team's pages, their own, then Manage with Periods", () => {
    expect(labelsOf(navigationFor(UserRole.OWNER, true))).toEqual([
      { label: "Team", items: TEAM },
      { label: "My time", items: MY_TIME },
      { label: "Manage", items: OWNER_MANAGE },
    ]);
  });

  it("gives a manager the same, with only People and Projects to manage", () => {
    expect(labelsOf(navigationFor(UserRole.MANAGER, true))).toEqual([
      { label: "Team", items: TEAM },
      { label: "My time", items: MY_TIME },
      { label: "Manage", items: ["People", "Projects"] },
    ]);
  });

  it("leaves out an owner's or a manager's own pages when they have no time to log", () => {
    for (const role of [UserRole.OWNER, UserRole.MANAGER]) {
      expect(navigationFor(role, false).map((group) => group.label)).toEqual([
        "Team",
        "Manage",
      ]);
    }
  });

  it("gives an employee their timesheet and their month, with no group label, either way", () => {
    for (const tracksOwnTime of [true, false]) {
      expect(labelsOf(navigationFor(UserRole.EMPLOYEE, tracksOwnTime))).toEqual(
        [{ label: undefined, items: MY_TIME }],
      );
    }
  });

  it("gives every item its own icon", () => {
    const items = navigationFor(UserRole.OWNER, true).flatMap(
      (group) => group.items,
    );

    expect(new Set(items.map((item) => item.icon)).size).toBe(items.length);
  });
});

describe("isActivePath", () => {
  it("matches the page and the pages under it, not a longer name", () => {
    expect(isActivePath("/team", "/team")).toBe(true);
    expect(isActivePath("/admin/users/42", "/admin/users")).toBe(true);
    expect(isActivePath("/teams", "/team")).toBe(false);
  });
});

describe("pageLabelFor", () => {
  it("names the page, a page under it included", () => {
    expect(pageLabelFor("/planning")).toBe("Planning");
    expect(pageLabelFor("/my-time")).toBe("Review my time");
    expect(pageLabelFor("/admin/periods")).toBe("Periods");
    expect(pageLabelFor("/admin/users/42")).toBe("People");
  });

  it("names a page left out of the menu, opened by its address", () => {
    expect(pageLabelFor("/timesheet")).toBe("Log my time");
  });

  it("names Getting started and Settings, which sit outside the menu", () => {
    expect(pageLabelFor("/getting-started")).toBe("Getting started");
    expect(pageLabelFor("/settings")).toBe("Settings");
  });

  it("names nothing for a page it does not know", () => {
    expect(pageLabelFor("/")).toBeUndefined();
  });
});
