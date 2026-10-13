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

const TEAM_ROLES = [TeamRole.MEMBER, TeamRole.MANAGER];

const membershipPeriod = (membership: TeamMembership) => {
  const joined = formatDayMonthYearLabel(membership.joinedAt);

  return membership.leftAt
    ? `${joined} – ${formatDayMonthYearLabel(membership.leftAt)}`
    : `Since ${joined}`;
};

interface TeamRoleMenuProps {
  membership: MembershipWithUser;
  teamName: string;
  onChange: (roleInTeam: TeamRole) => void;
}

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
        {TEAM_ROLES.map((role) => (
          <DropdownMenuRadioItem key={role} value={role} closeOnClick>
            {TEAM_ROLE_LABELS[role]}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

const TeamEditForm = ({ team }: { team: Team }) => {
  const panel = useEntityPanel();
  const { update } = useTeamsMutations();

  const save = (data: NameFormData) =>
    update.mutate({ id: team.id, data }, { onSuccess: panel.stopEditing });

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
            // The role menu shows the role.
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
                onChange={(roleInTeam) =>
                  changes.changeRole(membership, roleInTeam)
                }
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
      status={<PanelStatus isActive={false} />}
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
