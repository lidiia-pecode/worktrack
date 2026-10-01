import { describe, expect, it } from "vitest";

import { UserRole } from "@/types/enums";

import { onlyViewerReason } from "./only-viewer";

const VIEWER = "viewer";
const base = {
  role: UserRole.MANAGER,
  viewerId: VIEWER,
  rowUserIds: [VIEWER],
  hasActiveFilters: false,
  ledTeamCount: 0,
};

describe("onlyViewerReason", () => {
  it("says a manager with no team leads none yet", () => {
    expect(onlyViewerReason(base)).toBe("noTeam");
  });

  it("says nobody has joined a manager's one team yet", () => {
    expect(onlyViewerReason({ ...base, ledTeamCount: 1 })).toBe("emptyTeam");
  });

  it("says a manager's teams have nobody in them yet", () => {
    expect(onlyViewerReason({ ...base, ledTeamCount: 2 })).toBe("emptyTeams");
  });

  it("says an owner is the only person so far", () => {
    expect(onlyViewerReason({ ...base, role: UserRole.OWNER })).toBe("alone");
  });

  it("says nothing once anybody else is in the grid", () => {
    expect(
      onlyViewerReason({ ...base, rowUserIds: [VIEWER, "someone"] }),
    ).toBeNull();
  });

  it("says nothing while a filter narrows the grid", () => {
    expect(onlyViewerReason({ ...base, hasActiveFilters: true })).toBeNull();
  });
});
