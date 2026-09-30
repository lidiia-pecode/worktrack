import { describe, expect, it } from "vitest";

import { resolveSettingsTab } from "./settings-tabs";

const EMPLOYEE = { isOwner: false, hasGoogleResult: false };

describe("resolveSettingsTab", () => {
  it("opens the tab named in the URL", () => {
    expect(resolveSettingsTab("security", EMPLOYEE)).toBe("security");
  });

  it("opens Profile for no tab or an unknown one", () => {
    expect(resolveSettingsTab(null, EMPLOYEE)).toBe("profile");
    expect(resolveSettingsTab("billing", EMPLOYEE)).toBe("profile");
  });

  it("keeps Company for the owner only", () => {
    expect(resolveSettingsTab("company", EMPLOYEE)).toBe("profile");
    expect(
      resolveSettingsTab("company", { isOwner: true, hasGoogleResult: false }),
    ).toBe("company");
  });

  it("opens Security for a Google link result", () => {
    expect(
      resolveSettingsTab(null, { isOwner: false, hasGoogleResult: true }),
    ).toBe("security");
  });
});
