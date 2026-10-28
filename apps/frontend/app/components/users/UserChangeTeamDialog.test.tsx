import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UserDetails } from "@/types";
import { TeamRole, UserRole, UserStatus } from "@/types/enums";

import { EntityPanelContext } from "../entity-panel/entity-panel-context";
import { mockEntityPanel } from "../entity-panel/mock-entity-panel";
import { UserChangeTeamDialog } from "./UserChangeTeamDialog";

const addMember = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));

vi.mock("@/hooks/useTeams", () => ({
  useTeamOptions: () => ({
    options: [
      { value: "t-1", label: "Design" },
      { value: "t-2", label: "Delivery" },
    ],
    isLoading: false,
    isError: false,
  }),
  useTeamMembers: () => ({ addMember }),
}));

vi.mock("@/hooks/useWorkSettings", () => ({
  useWorkSettings: () => ({ timezone: "Europe/Kyiv" }),
}));

const anna: UserDetails = {
  id: "u-1",
  companyId: "co-1",
  role: UserRole.EMPLOYEE,
  status: UserStatus.ACTIVE,
  firstName: "Anna",
  lastName: "Smith",
  email: "anna@example.test",
  googleLinked: false,
  hasPassword: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  projects: [],
  teams: [
    {
      id: "t-1",
      name: "Design",
      roleInTeam: TeamRole.MEMBER,
      joinedAt: "2026-01-05",
    },
  ],
};

const renderDialog = (user: UserDetails) =>
  render(
    <EntityPanelContext.Provider value={mockEntityPanel()}>
      <UserChangeTeamDialog user={user} onClose={vi.fn()} />
    </EntityPanelContext.Provider>,
  );

describe("UserChangeTeamDialog", () => {
  it("moves them once another team is chosen, leaving the current one", async () => {
    const user = userEvent.setup();
    renderDialog(anna);

    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Delivery" }));

    expect(
      screen.getByText(/Anna Smith leaves Design today and joins Delivery/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Move" }));

    expect(addMember.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u-1",
        roleInTeam: TeamRole.MEMBER,
        leaveCurrentTeam: true,
      }),
      expect.anything(),
    );
  });

  it("adds someone in no team without a move", async () => {
    const user = userEvent.setup();
    renderDialog({ ...anna, teams: [] });

    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Design" }));
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(addMember.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u-1", leaveCurrentTeam: false }),
      expect.anything(),
    );
  });
});
