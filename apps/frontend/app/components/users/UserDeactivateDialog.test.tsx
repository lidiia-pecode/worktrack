import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { User, UserDetails } from "@/types";
import { TeamRole, UserRole, UserStatus } from "@/types/enums";

import { EntityPanelContext } from "../entity-panel/entity-panel-context";
import { mockEntityPanel } from "../entity-panel/mock-entity-panel";
import { UserDeactivateDialog } from "./UserDeactivateDialog";

const emma: User = {
  id: "u-1",
  companyId: "co-1",
  role: UserRole.MANAGER,
  status: UserStatus.ACTIVE,
  firstName: "Emma",
  lastName: "Clarke",
  email: "emma@example.test",
  googleLinked: false,
  hasPassword: true,
  lastWorkingDay: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const details: UserDetails = {
  ...emma,
  projects: [],
  team: {
    id: "t-1",
    name: "Design",
    roleInTeam: TeamRole.MANAGER,
    joinedAt: "2026-01-05",
  },
};

const NOTHING_AFTER = {
  time: { entryCount: 0, minutes: 0, firstDate: null, lastDate: null },
  absences: [],
  plans: [],
};

const impact = vi.hoisted(() => ({
  current: { data: undefined as unknown, isError: false },
}));

vi.mock("@/hooks/useUsers", () => ({
  useUserDetails: () => ({ data: details, isError: false }),
  useUserStatusMutations: () => ({
    deactivate: { mutate: vi.fn(), isPending: false },
  }),
  useDeactivationImpact: () => impact.current,
}));

vi.mock("@/hooks/useWorkSettings", () => ({
  useWorkSettings: () => ({ timezone: "UTC" }),
}));

vi.mock("@/hooks/useReportingPeriods", () => ({
  useReportingPeriods: () => ({ months: [] }),
}));

const panel = mockEntityPanel();

const renderDialog = () =>
  render(
    <EntityPanelContext.Provider value={panel}>
      <UserDeactivateDialog user={emma} onClose={vi.fn()} />
    </EntityPanelContext.Provider>,
  );

describe("UserDeactivateDialog", () => {
  it("names the team they lead, once it has loaded", async () => {
    impact.current = { data: NOTHING_AFTER, isError: false };
    renderDialog();

    expect(await screen.findByRole("link", { name: "Design" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeEnabled();
  });

  // Deactivating deletes what comes after the last day, so it waits until the
  // dialog can say what that is.
  it("can't deactivate until it knows what will be deleted", async () => {
    impact.current = { data: undefined, isError: false };
    renderDialog();

    expect(await screen.findByRole("link", { name: "Design" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeDisabled();
  });
});
