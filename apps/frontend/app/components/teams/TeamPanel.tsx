"use client";

import { useState } from "react";
import {
  ArrowRightLeft,
  ChevronsUpDown,
  Mail,
  Plus,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useAuth";
import { usePendingInvitations } from "@/hooks/auth/useInvitation";
import { useTeamDetails, useTeamsMutations } from "@/hooks/useTeams";
import { ROLE_LABELS, TEAM_ROLE_LABELS } from "@/lib/constants";
import { formatDayMonthYearLabel } from "@/lib/utils/date";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { PendingInvitation } from "@/types/Invitation";
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
import { RevokeInvitationModal } from "../users/PendingInvitations";
import { UserChangeTeamDialog } from "../users/UserChangeTeamDialog";
import { TEAM_NAME_FIELD } from "./TeamCreateDialog";
import { MEMBERS_PICKER, TeamMembersPicker } from "./TeamMembersPicker";
import {
  activeManager,
  currentMemberships,
  formerMemberships,
  managerMembership,
  MembershipWithUser,
  NO_ACTIVE_MANAGER,
} from "./team-memberships";
import { TeamManagerDialog } from "./TeamManagerDialog";
import { TeamMemberRemoveDialog, TeamRemoval } from "./TeamMemberRemoveDialog";
import { isActiveTeam, useTeamActions } from "./useTeamActions";

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

const FormerMembersList = ({ team, note }: { team: Team; note?: string }) => (
  <PanelList
    title="Former members"
    note={note}
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
);

/** The team's invitations still waiting, for the owner to revoke. */
const TeamInvitations = ({ team }: { team: Team }) => {
  const { data: invitations = [] } = usePendingInvitations();
  const [invitationToRevoke, setInvitationToRevoke] =
    useState<PendingInvitation | null>(null);
  const teamInvitations = invitations.filter(
    (invitation) => invitation.team?.id === team.id,
  );

  if (teamInvitations.length === 0) return null;

  return (
    <>
      <PanelList
        title="Pending invitations"
        items={teamInvitations}
        getKey={(invitation) => invitation.id}
        renderRow={(invitation) => ({
          name: invitation.email,
          detail: ROLE_LABELS[invitation.role],
          status: invitation.expired && (
            <Badge variant="warning">Expired</Badge>
          ),
          remove: {
            label: `Revoke the invitation to ${invitation.email}`,
            onClick: () => setInvitationToRevoke(invitation),
          },
        })}
        emptyText="No invitations are waiting."
      />

      <RevokeInvitationModal
        invitation={invitationToRevoke}
        onClose={() => setInvitationToRevoke(null)}
      />
    </>
  );
};

/** The team's manager as a link, for anyone who can't change them. */
const ManagerLink = ({ team }: { team: Team }) => {
  const manager = activeManager(team);

  return manager ? (
    <EntityLink entity={{ type: "user", id: manager.id }} tone="chip">
      <Avatar user={manager} size="xs" className="size-5 ring-0" />
      {fullName(manager)}
    </EntityLink>
  ) : (
    <ManageWarning>{NO_ACTIVE_MANAGER}</ManageWarning>
  );
};

/**
 * The owner's Manager line: one button that shows the manager and changes
 * them. A pending manager invitation holds the lead until it is accepted or
 * revoked.
 */
const ManagerPicker = ({ team }: { team: Team }) => {
  const { data: invitations = [], isLoading } = usePendingInvitations();
  const [isChanging, setIsChanging] = useState(false);
  const lead = managerMembership(team)?.user;
  const invitedLead = invitations.find(
    (invitation) =>
      invitation.team?.id === team.id && invitation.role === UserRole.MANAGER,
  );

  // Until the invitations load, it isn't known whether one holds the lead.
  if (isLoading) return <ManagerLink team={team} />;

  if (invitedLead) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Mail aria-hidden="true" className="size-4 shrink-0" />
        Invited: {invitedLead.email}. Revoke the invitation below to choose
        someone else.
      </span>
    );
  }

  return (
    <>
      {lead ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="pl-1.5"
          aria-label={`Change manager, now ${fullName(lead)}${isDeactivatedUser(lead) ? ", deactivated" : ""}`}
          onClick={() => setIsChanging(true)}
        >
          <Avatar user={lead} size="xs" className="size-5 ring-0" />
          {fullName(lead)}
          {isDeactivatedUser(lead) && (
            <Badge variant="neutral">Deactivated</Badge>
          )}
          <ChevronsUpDown
            aria-hidden="true"
            className="text-muted-foreground"
          />
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsChanging(true)}
        >
          <Plus />
          Add a manager
        </Button>
      )}

      <TeamManagerDialog
        team={team}
        isOpen={isChanging}
        onClose={() => setIsChanging(false)}
      />
    </>
  );
};

const ActiveTeamView = ({ team }: { team: Team }) => {
  const { user: viewer } = useAuth();
  const isOwner = viewer?.role === UserRole.OWNER;
  const panel = useEntityPanel();
  const teamActions = useTeamActions();
  const [removal, setRemoval] = useState<TeamRemoval | null>(null);
  const [movingMembership, setMovingMembership] =
    useState<MembershipWithUser | null>(null);

  const isEditing = panel.isEditing && teamActions.canEdit(team);

  if (isOwner && panel.view === MEMBERS_PICKER) {
    return <TeamMembersPicker team={team} />;
  }

  // The owner moves members; the manager moves once the team has another one,
  // and a deactivated person can't join a team, so there is nowhere to move them.
  const canMove = (membership: MembershipWithUser) =>
    isOwner &&
    !isEditing &&
    !isDeactivatedUser(membership.user) &&
    membership.roleInTeam === TeamRole.MEMBER;

  // A manager removes members; the team's manager is the owner's to remove.
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
            label: "Manager",
            value:
              isOwner && !isEditing ? (
                <ManagerPicker team={team} />
              ) : (
                <ManagerLink team={team} />
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
            actions: canMove(membership)
              ? [
                  {
                    label: "Move to…",
                    icon: ArrowRightLeft,
                    onSelect: () => setMovingMembership(membership),
                  },
                ]
              : undefined,
            remove: canRemove(membership)
              ? {
                  label: `Remove ${fullName(membership.user)} from ${team.name}`,
                  onClick: () =>
                    setRemoval({ teamId: team.id, userId: membership.userId }),
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

        {isOwner && <TeamInvitations team={team} />}

        {formerMemberships(team).length > 0 && (
          <FormerMembersList team={team} />
        )}
      </EntityPanelLayout>

      {teamActions.dialogs}
      <TeamMemberRemoveDialog
        removal={removal}
        onClose={() => setRemoval(null)}
      />
      <UserChangeTeamDialog
        user={movingMembership?.user ?? null}
        currentTeam={
          movingMembership && {
            id: team.id,
            name: team.name,
            roleInTeam: movingMembership.roleInTeam,
            joinedAt: movingMembership.joinedAt,
          }
        }
        onClose={() => setMovingMembership(null)}
      />
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
      <FormerMembersList
        team={team}
        note="Restoring brings the team back as it is: empty, with its history."
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
