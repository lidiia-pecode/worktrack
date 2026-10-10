import { describe, expect, it } from "vitest";

import {
  formatEntityRef,
  parseEntityRef,
  urlWithOpenEntity,
} from "./entity-ref";

describe("entity refs", () => {
  it("reads back what it writes", () => {
    const ref = { type: "project", id: "p-1" } as const;

    expect(parseEntityRef(formatEntityRef(ref))).toEqual(ref);
  });

  it("ignores a value that names no entity", () => {
    expect(parseEntityRef(null)).toBeNull();
    expect(parseEntityRef("p-1")).toBeNull();
    expect(parseEntityRef("invoice:p-1")).toBeNull();
    expect(parseEntityRef("project:")).toBeNull();
  });

  it("opens and closes the panel without touching other parameters", () => {
    const params = new URLSearchParams("tab=archived&onboarding=true");
    const opened = urlWithOpenEntity("/admin/projects", params, {
      type: "user",
      id: "u-1",
    });

    expect(new URL(opened, "http://x").searchParams.get("open")).toBe(
      "user:u-1",
    );
    expect(opened).toContain("tab=archived&onboarding=true");

    const closed = urlWithOpenEntity(
      "/admin/projects",
      new URL(opened, "http://x").searchParams,
      null,
    );
    expect(closed).toBe("/admin/projects?tab=archived&onboarding=true");
  });

  it("drops the question mark when nothing is left", () => {
    expect(
      urlWithOpenEntity(
        "/admin/teams",
        new URLSearchParams("open=team:t-1"),
        null,
      ),
    ).toBe("/admin/teams");
  });
});
