import { describe, expect, it } from "vitest";

import { describeListedPeople } from "./ReportsView";

describe("describeListedPeople", () => {
  it("says who each tab lists", () => {
    expect(describeListedPeople("hours", false)).toBe(
      "People with logged time in this period.",
    );
    expect(describeListedPeople("planned-vs-actual", false)).toBe(
      "People with a plan or logged time in this period.",
    );
    expect(describeListedPeople("utilisation", false)).toBe(
      "Everyone active, plus deactivated people with logged time. “—” means there was nothing to measure.",
    );
  });

  it("tells a manager the figures cover only their teams", () => {
    expect(describeListedPeople("hours", true)).toBe(
      "People with logged time in this period. Only you and the teams you lead are counted.",
    );
  });
});
