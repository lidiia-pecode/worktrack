"use client";

import { UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamDetails, useTeamsMutations } from "@/hooks/useTeams";
import { TEAM_ROLE_LABELS } from "@/lib/constants";
import { formatDayMonthYearLabel } from "@/lib/utils/date";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Team, TeamMembership, TeamUser } from "@/types/Team";
import { TeamRole, UserRole } from "@/types/enums";

import { EntityLink, EntityLinks } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelDetails,
  PanelEditForm,
  PanelList,
  PanelQueryState,
  PanelRemoveButton,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { FormSelect } from "../shared/FormSelect";
import { ManageWarning } from "../shared/resource/ManageList";
import { TeamForm, TeamFormData } from "./TeamForm";
import { MEMBERS_PICKER, TeamMembersPicker } from "./TeamMembersPicker";
import {
  activeManagers,
  CurrentMembership,
  currentMemberships,
} from "./team-memberships";
import { isActiveTeam, useTeamActions } from "./useTeamActions";
import { useTeamMemberChanges } from "./useTeamMemberChanges";

const EDIT_FORM_ID = "team-edit-form";

const roleOptions = [TeamRole.MEMBER, TeamRole.MANAGER].map((value) => ({
  label: TEAM_ROLE_LABELS[value],
  value,
}));

type FormerMembership = TeamMembership & { user: TeamUser };

const membershipPeriod = (membership: TeamMembership) => {
  const joined = formatDayMonthYearLabel(membership.joinedAt);

  return membership.leftAt
    ? `${joined} – ${formatDayMonthYearLabel(membership.leftAt)}`
    : `Since ${joined}`;
};

const TeamEditForm = ({ team }: { team: Team }) => {
  const panel = useEntityPanel();
  const { update } = useTeamsMutations();

  const save = (data: TeamFormData) =>
    update.mutate({ id: team.id, data }, { onSuccess: panel.stopEditing });

  return (
    <PanelEditForm
      formId={EDIT_FORM_ID}
      isSaving={update.isPending}
      onCancel={panel.stopEditing}
    >
      <TeamForm
        formId={EDIT_FORM_ID}
        mode="edit"
        defaultValues={{ name: team.name }}
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
    return (
      <>
        <TeamMembersPicker team={team} changes={changes} />
        {changes.dialogs}
      </>
    );
  }

  // The owner sets roles; a manager only removes, from a team they lead.
  // Leading a team takes the Manager role, which an employee is given first.
  // A deactivated member can only be removed.
  const canChangeRole = (membership: CurrentMembership) =>
    isOwner && !isEditing && !isDeactivatedUser(membership.user);

  const setsRole = (membership: CurrentMembership) =>
    canChangeRole(membership) && membership.user.role === UserRole.MANAGER;

  const roleControl = (membership: CurrentMembership) => {
    if (setsRole(membership)) {
      return (
        <FormSelect
          aria-label={`Role of ${fullName(membership.user)} in ${team.name}`}
          value={membership.roleInTeam}
          options={roleOptions}
          onValueChange={(roleInTeam) =>
            changes.changeRole(membership, roleInTeam as TeamRole)
          }
          className="w-auto"
          triggerClassName="h-8 w-auto gap-2 px-2.5 text-xs"
        />
      );
    }

    if (
      !canChangeRole(membership) ||
      membership.user.role !== UserRole.EMPLOYEE
    ) {
      return null;
    }

    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        aria-label={`Make Manager: ${fullName(membership.user)}`}
        onClick={() => changes.promote(membership.user)}
      >
        Make Manager
      </Button>
    );
  };

  return (
    <>
      <EntityPanelLayout
        name={team.name}
        status={<PanelStatus isActive />}
        onEdit={
          teamActions.canEdit(team) ? () => teamActions.edit(team) : undefined
        }
        actions={teamActions.actionsFor(team)}
        isEditing={isEditing}
      >
        {isEditing ? (
          <TeamEditForm team={team} />
        ) : (
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
          title="Members"
          items={currentMemberships(team)}
          getKey={(membership) => membership.id}
          renderRow={(membership) => ({
            label: (
              <EntityLink entity={{ type: "user", id: membership.user.id }}>
                {fullName(membership.user)}
              </EntityLink>
            ),
            // The role select already shows the role.
            detail: setsRole(membership)
              ? membershipPeriod(membership)
              : `${TEAM_ROLE_LABELS[membership.roleInTeam]} · ${membershipPeriod(membership)}`,
            badge: (
              <div className="flex items-center gap-2">
                {isDeactivatedUser(membership.user) && (
                  <Badge variant="neutral">Deactivated</Badge>
                )}
                {roleControl(membership)}
                {!isEditing && (
                  <PanelRemoveButton
                    label={`Remove ${fullName(membership.user)} from ${team.name}`}
                    onClick={() => changes.remove(membership)}
                  />
                )}
              </div>
            ),
          })}
          emptyText={
            isOwner
              ? "Nobody is on this team yet. A restored team comes back with no members."
              : "Nobody is on this team yet. An owner adds people to it."
          }
          action={
            isOwner &&
            !isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => panel.openView(MEMBERS_PICKER, team.name)}
                className="gap-1.5"
              >
                <UserPlus className="size-4" />
                Add members
              </Button>
            )
          }
        />
      </EntityPanelLayout>

      {teamActions.dialogs}
      {changes.dialogs}
    </>
  );
};

/** An archived team's memberships are all closed; it lists who was on it. */
const ArchivedTeamView = ({ team }: { team: Team }) => {
  const teamActions = useTeamActions();
  const formerMembers = (team.memberships ?? []).filter(
    (membership): membership is FormerMembership => Boolean(membership.user),
  );

  return (
    <>
      <EntityPanelLayout
        name={team.name}
        status={<PanelStatus isActive={false} />}
        actions={teamActions.actionsFor(team)}
      >
        <PanelList
          title="Former members"
          note="Restoring the team starts it with no members."
          items={formerMembers}
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
          emptyText="Nobody was on this team."
        />
      </EntityPanelLayout>

      {teamActions.dialogs}
    </>
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
