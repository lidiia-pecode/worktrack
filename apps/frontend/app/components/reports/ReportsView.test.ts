import { describe, expect, it } from "vitest";

import { describeListedRows } from "./ReportsView";

describe("describeListedRows", () => {
  it("says what each tab lists", () => {
    expect(describeListedRows("projects", false)).toBe(
      "Projects with logged or planned time in this period.",
    );
    expect(describeListedRows("activities", false)).toBe(
      "Activities with logged time. Plans are made per project, so there is no plan here.",
    );
    expect(describeListedRows("people", false)).toContain(
      "Expected is their capacity minus time off.",
    );
  });

  it("tells a manager the figures cover only their teams", () => {
    expect(describeListedRows("clients", true)).toBe(
      "Clients with logged or planned time in this period. Only you and the teams you lead are counted.",
    );
  });
});
