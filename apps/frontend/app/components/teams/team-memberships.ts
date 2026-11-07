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

/** Who was on the team, with the dates; only the owner reads them. */
export const formerMemberships = (team: Team) =>
  withUser(team).filter((membership) => membership.leftAt);

export const NO_ACTIVE_MANAGER = "No active manager";

export const leftWithoutManagerText = (team: Team) =>
  `${team.name} is then left without an active manager.`;

/** The team's manager's membership, deactivated or not; a team has one at most. */
export const managerMembership = (team: Team) =>
  currentMemberships(team).find(
    (membership) => membership.roleInTeam === TeamRole.MANAGER,
  );

/** The manager who acts for the team; a deactivated one doesn't. */
export const activeManager = (team: Team): TeamUser | null => {
  const manager = managerMembership(team)?.user;
  return manager && !isDeactivatedUser(manager) ? manager : null;
};

export const deactivatedMembersCount = (team: Team) =>
  currentMemberships(team).filter((membership) =>
    isDeactivatedUser(membership.user),
  ).length;
