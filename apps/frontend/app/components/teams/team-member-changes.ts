import { fullName } from "@/lib/utils/user";
import { Team } from "@/types/Team";
import { TeamRole } from "@/types/enums";

import { activeManagers, CurrentMembership } from "./team-memberships";

export type MemberChange =
  | { kind: "role"; membership: CurrentMembership; roleInTeam: TeamRole }
  | { kind: "remove"; membership: CurrentMembership };

interface ChangeContext {
  isOwner: boolean;
  /** The person's other teams the viewer can see. */
  otherTeamsCount: number;
}

const isOnlyActiveManager = (team: Team, membership: CurrentMembership) =>
  membership.roleInTeam === TeamRole.MANAGER &&
  activeManagers(team).every((manager) => manager.id === membership.user.id);

/** What a change to someone's place in a team means, for its confirmation. */
export const memberChangeCopy = (
  change: MemberChange,
  team: Team,
  { isOwner, otherTeamsCount }: ChangeContext,
) => {
  const name = fullName(change.membership.user);
  const leavesNoManager = isOnlyActiveManager(team, change.membership)
    ? `${team.name} is then left without an active manager.`
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
