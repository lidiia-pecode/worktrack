import { describe, expect, it } from "vitest";

import { Team, TeamMembership } from "@/types/Team";
import { TeamRole, TeamStatus, UserRole, UserStatus } from "@/types/enums";

import { memberChangeCopy, pickerChangesCopy } from "./team-member-changes";
import { MembershipWithUser } from "./team-memberships";

const membership = (
  id: string,
  firstName: string,
  roleInTeam: TeamRole,
): MembershipWithUser => ({
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

  it("makes a step down a move when they are a member of another team", () => {
    const copy = memberChangeCopy(
      { kind: "role", membership: emma, roleInTeam: TeamRole.MEMBER },
      teamOf([emma, john]),
      { ...asOwner, otherMemberTeam: { id: "t-9", name: "Platform" } },
    );

    expect(copy.title).toBe("Move Emma Clarke to Design as a member?");
    expect(copy.description).toBe(
      "They leave Platform today and no longer see Design's members. Design is then left without an active manager.",
    );
    expect(copy.confirmText).toBe("Move");
  });

  it("does not warn when the manager removed was already deactivated", () => {
    const deactivated = {
      ...emma,
      user: { ...emma.user, status: UserStatus.DEACTIVATED },
    };

    expect(
      memberChangeCopy(
        { kind: "remove", membership: deactivated },
        teamOf([deactivated, john]),
        asOwner,
      ).description,
    ).toBe("They leave the team today.");
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

describe("pickerChangesCopy", () => {
  const team = teamOf([emma, john]);
  const design = { id: "t-9", name: "Design Studio" };

  it("confirms a move by naming the team they leave", () => {
    const copy = pickerChangesCopy(team, {
      moves: [{ name: "Anna Smith", fromTeam: design }],
      removals: [],
      leavesNoManager: false,
    });

    expect(copy.title).toBe("Move Anna Smith to Design?");
    expect(copy.description).toBe("Anna Smith leaves Design Studio today.");
    expect(copy.confirmText).toBe("Move");
  });

  it("lists several moves with where each comes from", () => {
    const copy = pickerChangesCopy(team, {
      moves: [
        { name: "Anna Smith", fromTeam: design },
        { name: "Bob Jones", fromTeam: { id: "t-8", name: "Delivery" } },
      ],
      removals: [],
      leavesNoManager: false,
    });

    expect(copy.title).toBe("Move 2 people to Design?");
    expect(copy.description).toBe(
      "They leave their current team today: Anna Smith (Design Studio), Bob Jones (Delivery).",
    );
  });

  it("asks once for moves and removals together", () => {
    const copy = pickerChangesCopy(team, {
      moves: [{ name: "Anna Smith", fromTeam: design }],
      removals: ["Emma Clarke"],
      leavesNoManager: true,
    });

    expect(copy.title).toBe(
      "Move Anna Smith to Design and remove Emma Clarke?",
    );
    expect(copy.description).toBe(
      "Anna Smith leaves Design Studio today. Removed from Design today: Emma Clarke. Design is then left without an active manager.",
    );
    expect(copy.confirmVariant).toBe("warning");
  });

  it("keeps the removal-only wording", () => {
    const copy = pickerChangesCopy(team, {
      moves: [],
      removals: ["John Clarke", "Emma Clarke"],
      leavesNoManager: false,
    });

    expect(copy.title).toBe("Remove 2 people from Design?");
    expect(copy.description).toBe("They leave the team today.");
    expect(copy.confirmText).toBe("Remove");
  });
});
