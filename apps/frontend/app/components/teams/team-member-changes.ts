import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Team } from "@/types/Team";
import { TeamRole } from "@/types/enums";

import {
  activeManagers,
  leftWithoutManagerText,
  MembershipWithUser,
} from "./team-memberships";

export type MemberChange =
  | { kind: "role"; membership: MembershipWithUser; roleInTeam: TeamRole }
  | { kind: "remove"; membership: MembershipWithUser };

interface ChangeContext {
  isOwner: boolean;
  /** The person's other teams the viewer can see. */
  otherTeamsCount: number;
}

// A deactivated manager already leaves the team without an active one.
const isOnlyActiveManager = (team: Team, membership: MembershipWithUser) =>
  membership.roleInTeam === TeamRole.MANAGER &&
  !isDeactivatedUser(membership.user) &&
  activeManagers(team).every((manager) => manager.id === membership.user.id);

/** The confirmation's wording for a role change or a removal. */
export const memberChangeCopy = (
  change: MemberChange,
  team: Team,
  { isOwner, otherTeamsCount }: ChangeContext,
) => {
  const name = fullName(change.membership.user);
  const leavesNoManager = isOnlyActiveManager(team, change.membership)
    ? leftWithoutManagerText(team)
    : null;

  if (change.kind === "role" && change.roleInTeam === TeamRole.MANAGER) {
    return {
      title: `Make ${name} the manager of ${team.name}?`,
      description:
        "They will see every member of the team, and their time, absences and plans.",
      confirmText: "Make manager",
    };
  }

  if (change.kind === "role") {
    return {
      title: `Make ${name} a member of ${team.name}?`,
      description: [
        "They stop seeing the team's other members, unless they manage them in another team.",
        leavesNoManager,
      ]
        .filter(Boolean)
        .join(" "),
      confirmText: "Make member",
    };
  }

  const inNoTeam =
    otherTeamsCount === 0 &&
    (isOwner
      ? "They are then in no team, so only you see them."
      : "You will no longer see them.");

  return {
    title: `Remove ${name} from ${team.name}?`,
    description: ["They leave the team today.", inNoTeam, leavesNoManager]
      .filter(Boolean)
      .join(" "),
    confirmText: "Remove",
  };
};
