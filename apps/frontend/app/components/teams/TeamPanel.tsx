"use client";

import { useState } from "react";
import { ArrowRightLeft, UserPlus, UserRoundCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useAuth";
import { usePendingInvitations } from "@/hooks/auth/useInvitation";
import { useTeamDetails, useTeamsMutations } from "@/hooks/useTeams";
import { ROLE_LABELS, TEAM_ROLE_LABELS } from "@/lib/constants";
import { formatDayMonthLabel, formatDayMonthYearLabel } from "@/lib/utils/date";
import { factsLine } from "@/lib/utils/text";
import { fullName, isDeactivatedUser, leaverLabel } from "@/lib/utils/user";
import { PendingInvitation } from "@/types/Invitation";
import { Team, TeamMembership } from "@/types/Team";
import { TeamRole, UserRole } from "@/types/enums";

import { EntityLink } from "../entity-panel/EntityLink";
import { Avatar } from "../shared/Avatar";
import {
  EntityPanelLayout,
  PanelEditForm,
  PanelIcon,
  PanelNotice,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { teams } from "../layout/sidebar/sidebar-navigation";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { PanelList } from "../entity-panel/PanelList";
import { NameForm, NameFormData } from "../shared/resource/NameForm";
import { RevokeInvitationModal } from "../users/PendingInvitations";
import { UserChangeTeamDialog } from "../users/UserChangeTeamDialog";
import { TEAM_NAME_FIELD } from "./TeamCreateDialog";
import { MEMBERS_PICKER, TeamMembersPicker } from "./TeamMembersPicker";
import {
  activeManager,
  currentMemberships,
  deactivatedMembersCount,
  formerMemberships,
  managerMembership,
  MembershipWithUser,
  NO_ACTIVE_MANAGER,
} from "./team-memberships";
import { TeamManagerDialog } from "./TeamManagerDialog";
import { TeamMemberRemoveDialog, TeamRemoval } from "./TeamMemberRemoveDialog";
import { isActiveTeam, useTeamActions } from "./useTeamActions";

const EDIT_FORM_ID = "team-edit-form";

const TeamIcon = () => (
  <PanelIcon>
    <teams.icon className="size-4" />
  </PanelIcon>
);

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
      detail: factsLine([
        TEAM_ROLE_LABELS[membership.roleInTeam],
        membershipPeriod(membership),
        leaverLabel(membership.user),
      ]),
      isInactive: isDeactivatedUser(membership.user),
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

/**
 * Who leads the team, under its name as the Teams table says it. A manager
 * invited and not yet joined holds the lead until they accept or the
 * invitation is revoked.
 */
const ManagerLine = ({
  team,
  invitedLead,
}: {
  team: Team;
  invitedLead?: PendingInvitation;
}) => {
  const manager = activeManager(team);

  if (invitedLead) return <>Manager invited: {invitedLead.email}</>;
  if (!manager) return null;

  return (
    <>
      Managed by{" "}
      <EntityLink
        entity={{ type: "user", id: manager.id }}
        tone="plain"
        className="font-medium"
      >
        {fullName(manager)}
      </EntityLink>
    </>
  );
};

/** A team nobody leads: said once, with the way to choose someone for the owner. */
const NoManagerNotice = ({
  team,
  onChoose,
}: {
  team: Team;
  onChoose?: () => void;
}) => {
  const lead = managerMembership(team)?.user;
  const lastDay = lead?.lastWorkingDay
    ? formatDayMonthLabel(lead.lastWorkingDay)
    : null;

  return (
    <PanelNotice
      title={lead ? NO_ACTIVE_MANAGER : "No manager yet"}
      description={
        lead
          ? lastDay
            ? `${fullName(lead)}'s last day was ${lastDay}.`
            : `${fullName(lead)} is deactivated.`
          : "Nobody leads this team yet."
      }
      action={
        onChoose && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onChoose}
            className="bg-card"
          >
            Choose manager
          </Button>
        )
      }
    />
  );
};

interface ManagerChange {
  /** The manager invited and not yet joined, who holds the lead. */
  invitedLead?: PendingInvitation;
  /** Until the invitations load, it isn't known whether one holds the lead. */
  isLoading: boolean;
}

/** The owner's view, which knows the team's pending invitations. */
const OwnerActiveTeamView = ({ team }: { team: Team }) => {
  const { data: invitations = [], isLoading } = usePendingInvitations();
  const invitedLead = invitations.find(
    (invitation) =>
      invitation.team?.id === team.id && invitation.role === UserRole.MANAGER,
  );

  return (
    <ActiveTeamView team={team} managerChange={{ invitedLead, isLoading }} />
  );
};

interface ActiveTeamViewProps {
  team: Team;
  /** The owner's, who chooses the manager; left out for anyone else. */
  managerChange?: ManagerChange;
}

const ActiveTeamView = ({ team, managerChange }: ActiveTeamViewProps) => {
  const { user: viewer } = useAuth();
  const isOwner = viewer?.role === UserRole.OWNER;
  const panel = useEntityPanel();
  const teamActions = useTeamActions();
  const [removal, setRemoval] = useState<TeamRemoval | null>(null);
  const [movingMembership, setMovingMembership] =
    useState<MembershipWithUser | null>(null);
  const [isChangingManager, setIsChangingManager] = useState(false);

  const isEditing = panel.isEditing && teamActions.canEdit(team);
  const hasActiveManager = Boolean(activeManager(team));
  const invitedLead = managerChange?.invitedLead;
  const canChangeManager =
    managerChange && !managerChange.isLoading && !invitedLead && !isEditing;
  const chooseManager = () => setIsChangingManager(true);

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

  // The manager first; deactivated members last, under their own heading, so
  // they don't read as part of the team that works now.
  const members = [...currentMemberships(team)].sort(
    (a, b) =>
      Number(isDeactivatedUser(a.user)) - Number(isDeactivatedUser(b.user)) ||
      Number(a.roleInTeam !== TeamRole.MANAGER) -
        Number(b.roleInTeam !== TeamRole.MANAGER),
  );
  const deactivatedCount = deactivatedMembersCount(team);

  return (
    <>
      <EntityPanelLayout
        leading={<TeamIcon />}
        name={team.name}
        subtitle={<ManagerLine team={team} invitedLead={invitedLead} />}
        status={
          !hasActiveManager &&
          !invitedLead && (
            <NoManagerNotice
              team={team}
              onChoose={canChangeManager ? chooseManager : undefined}
            />
          )
        }
        onEdit={
          teamActions.canEdit(team) ? () => teamActions.edit(team) : undefined
        }
        // Only the name changes, in the heading's place.
        editLabel="Rename"
        actions={[
          // Rare, so beside Archive rather than on the panel.
          ...(canChangeManager && hasActiveManager
            ? [
                {
                  label: "Change manager",
                  icon: UserRoundCog,
                  onSelect: chooseManager,
                },
              ]
            : []),
          ...teamActions.actionsFor(team),
        ]}
        editForm={isEditing && <TeamEditForm team={team} />}
        editsName
      >
        <PanelList
          title="Members"
          items={members}
          getKey={(membership) => membership.id}
          groupBy={(membership) =>
            isDeactivatedUser(membership.user)
              ? {
                  key: "deactivated",
                  heading: `Deactivated · ${deactivatedCount}`,
                }
              : null
          }
          renderRow={(membership) => ({
            entity: { type: "user", id: membership.user.id },
            name: fullName(membership.user),
            leading: <Avatar user={membership.user} />,
            detail: factsLine([
              TEAM_ROLE_LABELS[membership.roleInTeam],
              leaverLabel(membership.user) ?? membershipPeriod(membership),
            ]),
            isInactive: isDeactivatedUser(membership.user),
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
      {managerChange && (
        <TeamManagerDialog
          team={team}
          isOpen={isChangingManager}
          onClose={() => setIsChangingManager(false)}
        />
      )}
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
      leading={<TeamIcon />}
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

  if (!isActiveTeam(team)) return <ArchivedTeamView team={team} />;

  return viewer?.role === UserRole.OWNER ? (
    <OwnerActiveTeamView team={team} />
  ) : (
    <ActiveTeamView team={team} />
  );
};
