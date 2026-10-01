import { describe, expect, it } from "vitest";

import { createFirstLink } from "./useSetupLink";

describe("createFirstLink", () => {
  it("opens the create form on its own outside setup", () => {
    expect(createFirstLink("/admin/categories", false)).toBe(
      "/admin/categories?create=true",
    );
  });

  it("keeps the setup context when reached from setup", () => {
    const url = new URL(createFirstLink("/admin/activities", true), "http://x");

    expect(url.pathname).toBe("/admin/activities");
    expect(url.searchParams.get("create")).toBe("true");
    expect(url.searchParams.get("onboarding")).toBe("true");
  });
});
