import { isDeactivatedUser } from "@/lib/utils/user";
import { Team, TeamMembership, TeamUser } from "@/types/Team";
import { TeamRole } from "@/types/enums";

export type CurrentMembership = TeamMembership & { user: TeamUser };

/** Who is on the team today. */
export const currentMemberships = (team: Team): CurrentMembership[] =>
  (team.memberships ?? []).filter(
    (membership): membership is CurrentMembership =>
      !membership.leftAt && Boolean(membership.user),
  );

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
