import { isDeactivatedUser } from "@/lib/utils/user";
import { Team, TeamMembership, TeamUser } from "@/types/Team";
import { TeamRole } from "@/types/enums";

export type MembershipWithUser = TeamMembership & { user: TeamUser };

const withUser = (team: Team) =>
  (team.memberships ?? []).filter(
    (membership): membership is MembershipWithUser => Boolean(membership.user),
  );

/** Who is on the team today. */
export const currentMemberships = (team: Team) =>
  withUser(team).filter((membership) => !membership.leftAt);

/** Everyone who was on an archived team, whose memberships are all closed. */
export const formerMemberships = withUser;

export const NO_ACTIVE_MANAGER = "No active manager";

export const leftWithoutManagerText = (team: Team) =>
  `${team.name} is then left without an active manager.`;

export const activeManagers = (team: Team): TeamUser[] =>
  currentMemberships(team)
    .filter(
      (membership) =>
        membership.roleInTeam === TeamRole.MANAGER &&
        !isDeactivatedUser(membership.user),
    )
    .map((membership) => membership.user);

export const deactivatedMembersCount = (team: Team) =>
  currentMemberships(team).filter((membership) =>
    isDeactivatedUser(membership.user),
  ).length;
