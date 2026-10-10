"use client";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/auth/useAuth";
import { useUserCapacity } from "@/hooks/useCapacity";
import { useUserDetails } from "@/hooks/useUsers";
import { ROLE_LABELS, TEAM_ROLE_LABELS } from "@/lib/constants";
import { formatDayMonthYearLabel } from "@/lib/utils/date";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { ProjectStatus, UserRole } from "@/types/enums";

import { EntityLink } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelDetail,
  PanelDetails,
  PanelList,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { ManageWarning } from "../shared/resource/ManageList";
import { describeCapacity } from "./UserForm";
import { useUserActions } from "./useUserActions";

export const UserPanel = ({ id }: { id: string }) => {
  const { user: viewer } = useAuth();
  const isOwner = viewer?.role === UserRole.OWNER;
  const { data: user, isLoading, error, refetch } = useUserDetails(id);
  // Working hours are the owner's to read.
  const { capacity } = useUserCapacity(id, isOwner);
  const userActions = useUserActions();

  if (!user) {
    return (
      <PanelQueryState
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        mayBeHidden={viewer?.role === UserRole.MANAGER}
      />
    );
  }

  const isDeactivated = isDeactivatedUser(user);

  const details: PanelDetail[] = [
    { label: "Role", value: ROLE_LABELS[user.role] },
    { label: "Position", value: user.position || "Not specified" },
  ];
  if (isOwner) {
    details.push({ label: "Working hours", value: describeCapacity(capacity) });
  }

  return (
    <>
      <EntityPanelLayout
        name={fullName(user)}
        detail={user.email}
        status={
          <PanelStatus isActive={!isDeactivated} inactiveLabel="Deactivated" />
        }
        onEdit={
          userActions.canEdit(user) ? () => userActions.edit(user) : undefined
        }
        actions={userActions.actionsFor(user)}
      >
        <PanelDetails details={details} />

        <PanelList
          title="Team"
          items={user.teams}
          getKey={(team) => team.id}
          renderRow={(team) => ({
            label: (
              <EntityLink entity={{ type: "team", id: team.id }}>
                {team.name}
              </EntityLink>
            ),
            detail: `${TEAM_ROLE_LABELS[team.roleInTeam]} since ${formatDayMonthYearLabel(team.joinedAt)}`,
          })}
          emptyText={
            <>
              <ManageWarning inline>No team</ManageWarning>, so only the owner
              sees them.
            </>
          }
        />

        <PanelList
          title="Projects"
          items={user.projects}
          getKey={(project) => project.id}
          renderRow={(project) => ({
            label: (
              <EntityLink entity={{ type: "project", id: project.id }}>
                {project.name}
              </EntityLink>
            ),
            badge: project.status === ProjectStatus.ARCHIVED && (
              <Badge variant="neutral">Archived</Badge>
            ),
          })}
          emptyText="Not on any projects yet."
        />
      </EntityPanelLayout>

      {userActions.dialogs}
    </>
  );
};
