"use client";

import { UserCog, UserPlus, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamDetails, useTeamsMutations } from "@/hooks/useTeams";
import { TEAM_ROLE_LABELS } from "@/lib/constants";
import { formatDayMonthYearLabel } from "@/lib/utils/date";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Team, TeamMembership } from "@/types/Team";
import { TeamRole, UserRole } from "@/types/enums";

import { EntityLink } from "../entity-panel/EntityLink";
import { Avatar } from "../shared/Avatar";
import {
  EntityPanelLayout,
  PanelEditForm,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { PanelList } from "../entity-panel/PanelList";
import { ManageWarning } from "../shared/resource/ManageList";
import { NameForm, NameFormData } from "../shared/resource/NameForm";
import { TEAM_NAME_FIELD } from "./TeamCreateDialog";
import { MEMBERS_PICKER, TeamMembersPicker } from "./TeamMembersPicker";
import {
  activeManagers,
  currentMemberships,
  formerMemberships,
  MembershipWithUser,
  NO_ACTIVE_MANAGER,
} from "./team-memberships";
import { isActiveTeam, useTeamActions } from "./useTeamActions";
import { useTeamMemberChanges } from "./useTeamMemberChanges";

const EDIT_FORM_ID = "team-edit-form";

const membershipPeriod = (membership: TeamMembership) => {
  const joined = formatDayMonthYearLabel(membership.joinedAt);

  return membership.leftAt
    ? `${joined} – ${formatDayMonthYearLabel(membership.leftAt)}`
    : `Since ${joined}`;
};

const TeamEditForm = ({ team }: { team: Team }) => {
  const panel = useEntityPanel();
  const { update } = useTeamsMutations();

  const save = (data: NameFormData) =>
    update.mutateAsync({ id: team.id, data }, { onSuccess: panel.stopEditing });

  return (
    <PanelEditForm
      formId={EDIT_FORM_ID}
      isSaving={update.isPending}
      onCancel={panel.stopEditing}
    >
      <NameForm
        formId={EDIT_FORM_ID}
        {...TEAM_NAME_FIELD}
        defaultName={team.name}
        onSubmit={save}
        isSubmitting={update.isPending}
        onDirtyChange={panel.setHasUnsavedChanges}
      />
    </PanelEditForm>
  );
};

const ActiveTeamView = ({ team }: { team: Team }) => {
  const { user: viewer } = useAuth();
  const isOwner = viewer?.role === UserRole.OWNER;
  const panel = useEntityPanel();
  const teamActions = useTeamActions();
  const changes = useTeamMemberChanges(team);

  const isEditing = panel.isEditing && teamActions.canEdit(team);
  const managers = activeManagers(team);

  if (isOwner && panel.view === MEMBERS_PICKER) {
    return <TeamMembersPicker team={team} />;
  }

  // Only the owner changes roles, and not for a deactivated member.
  const canChangeRole = (membership: MembershipWithUser) =>
    isOwner && !isEditing && !isDeactivatedUser(membership.user);

  // A manager removes members; a team's managers are the owner's to remove.
  const canRemove = (membership: MembershipWithUser) =>
    !isEditing && (isOwner || membership.roleInTeam === TeamRole.MEMBER);

  return (
    <>
      <EntityPanelLayout
        type="Team"
        name={team.name}
        onEdit={
          teamActions.canEdit(team) ? () => teamActions.edit(team) : undefined
        }
        actions={teamActions.actionsFor(team)}
        details={[
          {
            label: managers.length === 1 ? "Manager" : "Managers",
            value:
              managers.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {managers.map((manager) => (
                    <EntityLink
                      key={manager.id}
                      entity={{ type: "user", id: manager.id }}
                      tone="chip"
                    >
                      <Avatar
                        user={manager}
                        size="xs"
                        className="size-5 ring-0"
                      />
                      {fullName(manager)}
                    </EntityLink>
                  ))}
                </span>
              ) : (
                <ManageWarning>{NO_ACTIVE_MANAGER}</ManageWarning>
              ),
            wide: true,
          },
        ]}
        editForm={isEditing && <TeamEditForm team={team} />}
        editsName
      >
        <PanelList
          title="Members"
          items={currentMemberships(team)}
          getKey={(membership) => membership.id}
          renderRow={(membership) => ({
            entity: { type: "user", id: membership.user.id },
            name: fullName(membership.user),
            leading: <Avatar user={membership.user} />,
            detail: `${TEAM_ROLE_LABELS[membership.roleInTeam]} · ${membershipPeriod(membership)}`,
            status: isDeactivatedUser(membership.user) && (
              <Badge variant="neutral">Deactivated</Badge>
            ),
            actions: canChangeRole(membership)
              ? [
                  membership.roleInTeam === TeamRole.MANAGER
                    ? {
                        label: "Make member",
                        icon: UserRound,
                        onSelect: () =>
                          changes.changeRole(membership, TeamRole.MEMBER),
                      }
                    : {
                        label: "Make manager",
                        icon: UserCog,
                        onSelect: () =>
                          changes.changeRole(membership, TeamRole.MANAGER),
                      },
                ]
              : undefined,
            remove: canRemove(membership)
              ? {
                  label: `Remove ${fullName(membership.user)} from ${team.name}`,
                  onClick: () => changes.remove(membership),
                }
              : undefined,
          })}
          emptyText={
            isOwner
              ? "Nobody is on this team yet. A restored team comes back with no members."
              : "Nobody is on this team yet. An owner adds people to it."
          }
          add={
            isOwner && !isEditing
              ? {
                  label: "Add members",
                  icon: UserPlus,
                  onClick: () => panel.openView(MEMBERS_PICKER, team.name),
                }
              : undefined
          }
        />
      </EntityPanelLayout>

      {teamActions.dialogs}
      {changes.dialogs}
    </>
  );
};

const ArchivedTeamView = ({ team }: { team: Team }) => {
  const teamActions = useTeamActions();

  return (
    <EntityPanelLayout
      type="Team"
      name={team.name}
      status={<PanelStatus />}
      actions={teamActions.actionsFor(team)}
    >
      <PanelList
        title="Former members"
        note="Restoring the team starts it with no members."
        items={formerMemberships(team)}
        getKey={(membership) => membership.id}
        renderRow={(membership) => ({
          entity: { type: "user", id: membership.user.id },
          name: fullName(membership.user),
          leading: <Avatar user={membership.user} />,
          detail: `${TEAM_ROLE_LABELS[membership.roleInTeam]} · ${membershipPeriod(membership)}`,
          isInactive: isDeactivatedUser(membership.user),
          status: isDeactivatedUser(membership.user) && (
            <Badge variant="neutral">Deactivated</Badge>
          ),
        })}
        emptyText="Nobody was on this team."
      />
    </EntityPanelLayout>
  );
};

export const TeamPanel = ({ id }: { id: string }) => {
  const { user: viewer } = useAuth();
  const { data: team, isLoading, error, refetch } = useTeamDetails(id);

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

  return isActiveTeam(team) ? (
    <ActiveTeamView team={team} />
  ) : (
    <ArchivedTeamView team={team} />
  );
};
