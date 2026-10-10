import { describe, expect, it } from "vitest";

import { Team, TeamMembership } from "@/types/Team";
import { TeamRole, TeamStatus, UserRole, UserStatus } from "@/types/enums";

import { memberChangeCopy } from "./team-member-changes";
import { CurrentMembership } from "./team-memberships";

const membership = (
  id: string,
  firstName: string,
  roleInTeam: TeamRole,
): CurrentMembership => ({
  id: `m-${id}`,
  teamId: "t-1",
  userId: id,
  roleInTeam,
  joinedAt: "2026-01-05",
  leftAt: null,
  user: {
    id,
    firstName,
    lastName: "Clarke",
    email: `${firstName.toLowerCase()}@example.test`,
    role: UserRole.MANAGER,
    status: UserStatus.ACTIVE,
  },
});

const emma = membership("u-1", "Emma", TeamRole.MANAGER);
const john = membership("u-2", "John", TeamRole.MEMBER);

const teamOf = (memberships: TeamMembership[]): Team => ({
  id: "t-1",
  companyId: "c-1",
  name: "Design",
  status: TeamStatus.ACTIVE,
  memberships,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  company: {} as Team["company"],
});

const asOwner = { isOwner: true, otherTeamsCount: 1 };

describe("memberChangeCopy", () => {
  it("says a new manager sees the whole team", () => {
    const copy = memberChangeCopy(
      { kind: "role", membership: john, roleInTeam: TeamRole.MANAGER },
      teamOf([emma, john]),
      asOwner,
    );

    expect(copy.title).toBe("Make John Clarke the manager of Design?");
    expect(copy.description).toContain("see every member of the team");
  });

  it("warns when the only active manager steps down", () => {
    const team = teamOf([emma, john]);
    const stepDown = {
      kind: "role",
      membership: emma,
      roleInTeam: TeamRole.MEMBER,
    } as const;

    expect(memberChangeCopy(stepDown, team, asOwner).description).toContain(
      "Design is then left without an active manager.",
    );

    const secondManager = membership("u-3", "Lucy", TeamRole.MANAGER);
    expect(
      memberChangeCopy(stepDown, teamOf([emma, secondManager]), asOwner)
        .description,
    ).not.toContain("without an active manager");
  });

  it("tells the owner a person left in no team is theirs alone to see", () => {
    const copy = memberChangeCopy(
      { kind: "remove", membership: john },
      teamOf([emma, john]),
      { isOwner: true, otherTeamsCount: 0 },
    );

    expect(copy.description).toBe(
      "They leave the team today. They are then in no team, so only you see them.",
    );
  });

  it("tells a manager they lose sight of the person", () => {
    const copy = memberChangeCopy(
      { kind: "remove", membership: john },
      teamOf([emma, john]),
      { isOwner: false, otherTeamsCount: 0 },
    );

    expect(copy.description).toBe(
      "They leave the team today. You will no longer see them.",
    );
  });

  it("says nothing about visibility while they stay in another team", () => {
    const copy = memberChangeCopy(
      { kind: "remove", membership: emma },
      teamOf([emma, john]),
      asOwner,
    );

    expect(copy.description).toBe(
      "They leave the team today. Design is then left without an active manager.",
    );
  });
});
