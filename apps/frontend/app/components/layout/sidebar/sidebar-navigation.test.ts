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

const WORK = ["Team time", "Timesheet", "My time", "Planning", "Reports"];
const OWNER_MANAGE = [
  "People",
  "Teams",
  "Projects",
  "Activities",
  "Categories",
  "Periods",
];

describe("navigationFor", () => {
  it("gives an owner Work and Manage, with Periods", () => {
    expect(labelsOf(navigationFor(UserRole.OWNER))).toEqual([
      { label: "Work", items: WORK },
      { label: "Manage", items: OWNER_MANAGE },
    ]);
  });

  it("gives a manager the same Work, and only People and Projects to manage", () => {
    expect(labelsOf(navigationFor(UserRole.MANAGER))).toEqual([
      { label: "Work", items: WORK },
      { label: "Manage", items: ["People", "Projects"] },
    ]);
  });

  it("gives an employee their timesheet and their month, with no group label", () => {
    expect(labelsOf(navigationFor(UserRole.EMPLOYEE))).toEqual([
      { label: undefined, items: ["Timesheet", "My time"] },
    ]);
  });

  it("gives every item its own icon", () => {
    const items = navigationFor(UserRole.OWNER).flatMap((group) => group.items);

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
  it("names the page from the menu, a page under it included", () => {
    expect(pageLabelFor(UserRole.MANAGER, "/planning")).toBe("Planning");
    expect(pageLabelFor(UserRole.EMPLOYEE, "/my-time")).toBe("My time");
    expect(pageLabelFor(UserRole.OWNER, "/admin/periods")).toBe("Periods");
    expect(pageLabelFor(UserRole.OWNER, "/admin/users/42")).toBe("People");
  });

  it("names Getting started and Settings, which sit outside the menu", () => {
    expect(pageLabelFor(UserRole.OWNER, "/getting-started")).toBe(
      "Getting started",
    );
    expect(pageLabelFor(UserRole.EMPLOYEE, "/settings")).toBe("Settings");
  });

  it("names nothing for a page it does not know", () => {
    expect(pageLabelFor(UserRole.EMPLOYEE, "/")).toBeUndefined();
  });
});
