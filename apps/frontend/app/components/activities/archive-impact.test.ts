import { describe, expect, it } from "vitest";

import { distinctProjects } from "./archive-impact";

describe("distinctProjects", () => {
  it("names a project shared by several activities once, in name order", () => {
    const website = { id: "p-1", name: "Website" };
    const handbook = { id: "p-2", name: "Handbook" };

    expect(distinctProjects([website, handbook, website])).toEqual([
      handbook,
      website,
    ]);
  });
});
