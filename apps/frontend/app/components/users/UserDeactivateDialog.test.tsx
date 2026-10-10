import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { User, UserDetails } from "@/types";
import { Team, TeamMembership } from "@/types/Team";
import { TeamRole, TeamStatus, UserRole, UserStatus } from "@/types/enums";

import {
  EntityPanelContext,
  EntityPanelContextValue,
} from "../entity-panel/entity-panel-context";
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
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const membershipTeam = (id: string, name: string, roleInTeam: TeamRole) => ({
  id,
  name,
  status: TeamStatus.ACTIVE,
  roleInTeam,
  joinedAt: "2026-01-05",
});

const details: UserDetails = {
  ...emma,
  projects: [],
  teams: [
    membershipTeam("t-1", "Design", TeamRole.MANAGER),
    membershipTeam("t-2", "Support", TeamRole.MANAGER),
    membershipTeam("t-3", "Research", TeamRole.MEMBER),
  ],
};

const managerOf = (teamId: string, user: User): TeamMembership => ({
  id: `${teamId}-${user.id}`,
  teamId,
  userId: user.id,
  roleInTeam: TeamRole.MANAGER,
  joinedAt: "2026-01-05",
  leftAt: null,
  user,
});

const teamWithManagers = (id: string, name: string, managers: User[]) =>
  ({
    id,
    name,
    status: TeamStatus.ACTIVE,
    memberships: managers.map((manager) => managerOf(id, manager)),
  }) as Team;

const teams: Record<string, Team> = {
  "t-1": teamWithManagers("t-1", "Design", [emma]),
  "t-2": teamWithManagers("t-2", "Support", [
    emma,
    { ...emma, id: "u-2", firstName: "John" },
  ]),
};

vi.mock("@/hooks/useUsers", () => ({
  useUserDetails: () => ({ data: details, isError: false }),
  useUsersMutations: () => ({ archive: { mutate: vi.fn(), isPending: false } }),
}));

vi.mock("@/hooks/useTeams", () => ({
  teamDetailsQuery: (teamId: string) => ({
    queryKey: ["teams", "detail", teamId],
    queryFn: async () => teams[teamId],
  }),
}));

const panel: EntityPanelContextValue = {
  current: null,
  previous: null,
  open: vi.fn(),
  follow: vi.fn(),
  back: vi.fn(),
  close: vi.fn(),
  hrefFor: () => "#",
};

describe("UserDeactivateDialog", () => {
  it("names only the teams they manage alone, once those have loaded", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <EntityPanelContext.Provider value={panel}>
          <UserDeactivateDialog user={emma} onClose={vi.fn()} />
        </EntityPanelContext.Provider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("link", { name: "Design" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Support" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Research" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeEnabled();
  });
});
