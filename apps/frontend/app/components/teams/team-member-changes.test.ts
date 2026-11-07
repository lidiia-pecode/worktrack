import { describe, expect, it } from "vitest";

import { Team, TeamMembership } from "@/types/Team";
import { TeamRole, TeamStatus, UserRole, UserStatus } from "@/types/enums";

import {
  changeDayWords,
  pickerChangesCopy,
  removalCopy,
} from "./team-member-changes";
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

describe("removalCopy", () => {
  it("tells the owner the team keeps the past and a person in no team is theirs alone", () => {
    expect(
      removalCopy(john, teamOf([emma, john]), { isOwner: true }).description,
    ).toBe(
      "John Clarke leaves Design today. Their records from before today stay with the team. From today, only you can access their new records.",
    );
  });

  it("tells a manager they keep the past and lose what comes next", () => {
    expect(
      removalCopy(john, teamOf([emma, john]), { isOwner: false }).description,
    ).toBe(
      "John Clarke leaves the team today. You can still access their records from before today. From today, only the owner can access their new records.",
    );
  });

  it("names the day a removal is dated back to", () => {
    const copy = removalCopy(john, teamOf([emma, john]), {
      isOwner: true,
      day: changeDayWords("2026-11-03", "2026-11-05"),
    });

    expect(copy.description).toBe(
      "John Clarke leaves Design on Nov 3. Their records from before Nov 3 stay with the team. From Nov 3, only you can access their records.",
    );
  });

  it("warns that removing the manager leaves the team without one, unless already deactivated", () => {
    expect(
      removalCopy(emma, teamOf([emma, john]), { isOwner: true }).description,
    ).toContain("Design is then left without an active manager.");

    const deactivated = {
      ...emma,
      user: { ...emma.user, status: UserStatus.DEACTIVATED },
    };
    expect(
      removalCopy(deactivated, teamOf([deactivated, john]), { isOwner: true })
        .description,
    ).not.toContain("without an active manager");
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
    expect(copy.description).toBe(
      "Anna Smith leaves Design Studio today. Their records before today stay with Design Studio.",
    );
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
      "They leave their current team today: Anna Smith (Design Studio), Bob Jones (Delivery). Their records before today stay with those teams.",
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
      "Anna Smith leaves Design Studio today. Their records before today stay with Design Studio. Removed from Design today: Emma Clarke. Design is then left without an active manager.",
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
