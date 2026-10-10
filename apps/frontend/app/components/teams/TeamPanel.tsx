"use client";

import { ChevronDown, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamDetails, useTeamsMutations } from "@/hooks/useTeams";
import { TEAM_ROLE_LABELS } from "@/lib/constants";
import { formatDayMonthYearLabel } from "@/lib/utils/date";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Team, TeamMembership, TeamUser } from "@/types/Team";
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

interface TeamRoleMenuProps {
  membership: CurrentMembership;
  teamName: string;
  onChange: (roleInTeam: TeamRole) => void;
}

/** A member's role in the team, shown and changed in one quiet control. */
const TeamRoleMenu = ({
  membership,
  teamName,
  onChange,
}: TeamRoleMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-label={`Role of ${fullName(membership.user)} in ${teamName}: ${TEAM_ROLE_LABELS[membership.roleInTeam]}`}
          className="gap-1 text-muted-foreground group-hover:text-foreground data-popup-open:text-foreground"
        >
          {TEAM_ROLE_LABELS[membership.roleInTeam]}
          <ChevronDown className="size-3.5" />
        </Button>
      }
    />

    <DropdownMenuContent align="end" className="w-44">
      <DropdownMenuRadioGroup
        value={membership.roleInTeam}
        onValueChange={(value) => onChange(value as TeamRole)}
      >
        {roleOptions.map((option) => (
          <DropdownMenuRadioItem
            key={option.value}
            value={option.value}
            closeOnClick
          >
            {option.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

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
        <TeamMembersPicker team={team} />
      </>
    );
  }

  // The owner sets roles; a manager only removes, from a team they lead.
  // A deactivated member can only be removed.
  const canChangeRole = (membership: CurrentMembership) =>
    isOwner && !isEditing && !isDeactivatedUser(membership.user);

  // Leading a team takes the Manager role, which an employee is given first.
  const changeRole = (membership: CurrentMembership, roleInTeam: TeamRole) => {
    if (roleInTeam === membership.roleInTeam) return;

    const needsPromotion =
      roleInTeam === TeamRole.MANAGER &&
      membership.user.role === UserRole.EMPLOYEE;

    if (needsPromotion) changes.promote(membership);
    else changes.changeRole(membership, roleInTeam);
  };

  return (
    <>
      <EntityPanelLayout
        type="Team"
        name={team.name}
        status={<PanelStatus isActive />}
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
                <ManageWarning>No active manager</ManageWarning>
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
            // Where the role can change, its menu shows it.
            detail: canChangeRole(membership)
              ? membershipPeriod(membership)
              : `${TEAM_ROLE_LABELS[membership.roleInTeam]} · ${membershipPeriod(membership)}`,
            status: isDeactivatedUser(membership.user) && (
              <Badge variant="neutral">Deactivated</Badge>
            ),
            control: canChangeRole(membership) && (
              <TeamRoleMenu
                membership={membership}
                teamName={team.name}
                onChange={(roleInTeam) => changeRole(membership, roleInTeam)}
              />
            ),
            remove: isEditing
              ? undefined
              : {
                  label: `Remove ${fullName(membership.user)} from ${team.name}`,
                  onClick: () => changes.remove(membership),
                },
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
        type="Team"
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
