import { describe, expect, it } from "vitest";

import { UserRole } from "@/types/enums";

import {
  isActivePath,
  NavigationGroup,
  navigationFor,
} from "./sidebar-navigation";

const labelsOf = (groups: NavigationGroup[]) =>
  groups.map((group) => ({
    label: group.label,
    items: group.items.map((item) => item.label),
  }));

const WORK = ["Team time", "Timesheet", "Planning", "Reports"];
const MANAGE = ["Users", "Teams", "Projects", "Activities", "Categories"];

describe("navigationFor", () => {
  it("gives an owner Work and Manage, with Periods", () => {
    expect(labelsOf(navigationFor(UserRole.OWNER))).toEqual([
      { label: "Work", items: WORK },
      { label: "Manage", items: [...MANAGE, "Periods"] },
    ]);
  });

  it("gives a manager the same groups without Periods", () => {
    expect(labelsOf(navigationFor(UserRole.MANAGER))).toEqual([
      { label: "Work", items: WORK },
      { label: "Manage", items: MANAGE },
    ]);
  });

  it("gives an employee only the timesheet, with no group label", () => {
    expect(labelsOf(navigationFor(UserRole.EMPLOYEE))).toEqual([
      { label: undefined, items: ["Timesheet"] },
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
