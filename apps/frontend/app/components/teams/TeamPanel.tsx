"use client";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamDetails } from "@/hooks/useTeams";
import { TEAM_ROLE_LABELS } from "@/lib/constants";
import { formatDayMonthYearLabel } from "@/lib/utils/date";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { TeamMembership, TeamUser } from "@/types/Team";
import { UserRole } from "@/types/enums";

import { EntityLink, EntityLinks } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelDetails,
  PanelList,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { ManageWarning } from "../shared/resource/ManageList";
import { activeManagers, currentMemberships } from "./team-memberships";
import { isActiveTeam, useTeamActions } from "./useTeamActions";

type ShownMembership = TeamMembership & { user: TeamUser };

const membershipPeriod = (membership: TeamMembership) => {
  const joined = formatDayMonthYearLabel(membership.joinedAt);

  return membership.leftAt
    ? `${joined} – ${formatDayMonthYearLabel(membership.leftAt)}`
    : `Since ${joined}`;
};

export const TeamPanel = ({ id }: { id: string }) => {
  const { user: viewer } = useAuth();
  const { data: team, isLoading, error, refetch } = useTeamDetails(id);
  const teamActions = useTeamActions();

  if (!team) {
    return (
      <PanelQueryState
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        mayBeHidden={viewer?.role === UserRole.MANAGER}
      />
    );
  }

  const isActive = isActiveTeam(team);
  const managers = activeManagers(team);
  // An archived team's memberships are all closed; it lists who was on it.
  const memberships: ShownMembership[] = isActive
    ? currentMemberships(team)
    : (team.memberships ?? []).filter(
        (membership): membership is ShownMembership => Boolean(membership.user),
      );

  return (
    <>
      <EntityPanelLayout
        name={team.name}
        status={<PanelStatus isActive={isActive} />}
        onEdit={
          teamActions.canEdit(team) ? () => teamActions.edit(team) : undefined
        }
        actions={teamActions.actionsFor(team)}
      >
        {isActive && (
          <PanelDetails
            details={[
              {
                label: "Manager",
                value:
                  managers.length > 0 ? (
                    <EntityLinks
                      entities={managers.map((manager) => ({
                        entity: { type: "user", id: manager.id },
                        name: fullName(manager),
                      }))}
                    />
                  ) : (
                    <ManageWarning>No active manager</ManageWarning>
                  ),
              },
            ]}
          />
        )}

        <PanelList
          title={isActive ? "Members" : "Former members"}
          items={memberships}
          getKey={(membership) => membership.id}
          renderRow={(membership) => ({
            label: (
              <EntityLink entity={{ type: "user", id: membership.user.id }}>
                {fullName(membership.user)}
              </EntityLink>
            ),
            detail: `${TEAM_ROLE_LABELS[membership.roleInTeam]} · ${membershipPeriod(membership)}`,
            badge: isDeactivatedUser(membership.user) && (
              <Badge variant="neutral">Deactivated</Badge>
            ),
          })}
          emptyText={
            isActive
              ? "Nobody is on this team yet."
              : "Nobody was on this team."
          }
        />
      </EntityPanelLayout>

      {teamActions.dialogs}
    </>
  );
};
