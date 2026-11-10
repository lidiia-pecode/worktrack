"use client";

import { useState } from "react";
import { ArrowRightLeft, Plus, UserX } from "lucide-react";

import { StatusText } from "../shared/StatusText";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  useCancelCapacityChange,
  useSetCapacity,
  useUserCapacity,
} from "@/hooks/useCapacity";
import { useUserDetails, useUsersMutations } from "@/hooks/useUsers";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { ROLE_LABELS, TEAM_ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import {
  formatDayMonthYearLabel,
  formatDuration,
  todayISODate,
} from "@/lib/utils/date";
import {
  NO_FIXED_HOURS,
  lastWorkingDayLabel,
  fullName,
  isDeactivatedUser,
} from "@/lib/utils/user";
import { Capacity, UserDetails, UserTeam } from "@/types";
import { ProjectStatus, TeamRole, UserRole } from "@/types/enums";

import { linkedEntities } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelEditForm,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { PanelList } from "../entity-panel/PanelList";
import { Avatar } from "../shared/Avatar";
import { ImpactDialog } from "../shared/ImpactDialog";
import { ScheduledChange } from "../shared/ScheduledChange";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { ManageWarning } from "../shared/resource/ManageList";
import { useUserActions } from "./useUserActions";
import { UserChangeTeamDialog } from "./UserChangeTeamDialog";
import { UserForm, UserFormData } from "./UserForm";
import { PROJECTS_PICKER } from "../projects/ProjectChoicesPicker";
import { useProjectLinkChanges } from "../projects/useProjectLinkChanges";
import {
  TeamMemberRemoveDialog,
  TeamRemoval,
} from "../teams/TeamMemberRemoveDialog";
import { UserProjectsPicker } from "./UserProjectsPicker";
import {
  WORK_DAYS_PER_WEEK,
  minutesPerDayOf,
  minutesPerWeekOf,
} from "@/lib/forms/schemas/work-day.schema";

const EDIT_FORM_ID = "user-edit-form";

/** Wraps between its parts, never inside one. */
const dayAndWeek = (minutesPerWeek: number) =>
  minutesPerWeek === 0 ? (
    NO_FIXED_HOURS
  ) : (
    <>
      <span className="whitespace-nowrap">
        {formatDuration(minutesPerDayOf(minutesPerWeek))} a day
      </span>{" "}
      <span className="whitespace-nowrap text-muted-foreground">
        · {formatDuration(minutesPerWeek)} a week
      </span>
    </>
  );

interface WorkingHoursProps {
  user: UserDetails;
  capacity: Capacity | null;
  canCancelChanges: boolean;
}

/** Today's hours, and the change scheduled after them with a way to cancel it. */
const WorkingHours = ({
  user,
  capacity,
  canCancelChanges,
}: WorkingHoursProps) => {
  const cancelChange = useCancelCapacityChange();
  const [isCancelling, setIsCancelling] = useState(false);

  if (!capacity) {
    return <span className="text-muted-foreground">Not set</span>;
  }

  const { upcoming } = capacity;
  const hoursPerDay = (minutesPerWeek: number) =>
    `${formatDuration(minutesPerDayOf(minutesPerWeek))} a day`;

  const confirmCancel = () => {
    if (!upcoming) return;

    cancelChange.mutate(
      { userId: user.id, validFrom: upcoming.validFrom },
      { onSuccess: () => setIsCancelling(false) },
    );
  };

  return (
    <div className="grid gap-2">
      <span>{dayAndWeek(capacity.minutesPerWeek)}</span>

      {upcoming && (
        <ScheduledChange
          validFrom={upcoming.validFrom}
          cancel={
            canCancelChanges
              ? {
                  label: `Cancel the change to ${hoursPerDay(upcoming.minutesPerWeek)} from ${formatDayMonthYearLabel(upcoming.validFrom)}`,
                  onClick: () => setIsCancelling(true),
                }
              : undefined
          }
        >
          {dayAndWeek(upcoming.minutesPerWeek)}
        </ScheduledChange>
      )}

      {upcoming && (
        <ImpactDialog
          isOpen={isCancelling}
          title={`Cancel the change to ${hoursPerDay(upcoming.minutesPerWeek)}?`}
          description={
            // On the company default, the standard day may change by then.
            capacity.isCompanyDefault
              ? `From ${formatDayMonthYearLabel(upcoming.validFrom)} ${user.firstName} stays on the company's standard day.`
              : `From ${formatDayMonthYearLabel(upcoming.validFrom)} ${user.firstName} keeps ${hoursPerDay(capacity.minutesPerWeek)}.`
          }
          cancelText="Keep it"
          confirmText="Cancel change"
          confirmVariant="warning"
          onConfirm={confirmCancel}
          onClose={() => setIsCancelling(false)}
          loading={cancelChange.isPending}
        />
      )}
    </div>
  );
};

interface UserEditFormProps {
  user: UserDetails;
  capacity: Capacity;
}

const UserEditForm = ({ user, capacity }: UserEditFormProps) => {
  const panel = useEntityPanel();
  const { update } = useUsersMutations();
  const setCapacity = useSetCapacity();
  const { timezone } = useWorkSettings();
  const today = todayISODate(timezone);
  const [isRoleChangeBlocked, setIsRoleChangeBlocked] = useState(false);

  // A team's manager can't become an Employee. The API refuses too, but checking here lets the dialog name the team.
  const ledTeam = user.team?.roleInTeam === TeamRole.MANAGER ? user.team : null;

  const save = async (data: UserFormData) => {
    const { capacityHoursPerDay, capacityValidFrom, role, ...details } = data;
    // The role goes only when it changes: the API refuses Owner even unchanged.
    const userData = role === user.role ? details : { ...details, role };

    const becomesEmployee =
      user.role === UserRole.MANAGER && role === UserRole.EMPLOYEE;
    if (becomesEmployee && ledTeam) {
      setIsRoleChangeBlocked(true);
      return;
    }

    const minutesPerWeek = minutesPerWeekOf(capacityHoursPerDay);
    // A new date alone is a change too: it can set back hours scheduled for that day.
    const hoursChanged =
      minutesPerWeek !== capacity.minutesPerWeek || capacityValidFrom !== today;

    try {
      await update.mutateAsync({ id: user.id, data: userData });

      if (hoursChanged) {
        await setCapacity.mutateAsync({
          userId: user.id,
          minutesPerWeek,
          validFrom: capacityValidFrom,
        });
      }
    } catch {
      // Reported by the global mutation handler; the form stays open.
      return;
    }

    panel.stopEditing();
  };

  return (
    <>
      <PanelEditForm
        formId={EDIT_FORM_ID}
        isSaving={update.isPending || setCapacity.isPending}
        onCancel={panel.stopEditing}
      >
        <UserForm
          formId={EDIT_FORM_ID}
          userId={user.id}
          defaultValues={{
            position: user.position ?? "",
            role: user.role,
            capacityHoursPerDay:
              capacity.minutesPerWeek / WORK_DAYS_PER_WEEK / 60,
            capacityValidFrom: today,
          }}
          scheduledChange={capacity.upcoming}
          hoursSince={capacity.validFrom}
          onSubmit={save}
          onDirtyChange={panel.setHasUnsavedChanges}
        />
      </PanelEditForm>

      <ImpactDialog
        isOpen={isRoleChangeBlocked}
        title={`${fullName(user)} still leads a team`}
        description="A Manager who leads a team can't become an Employee."
        affected={[
          {
            label: "Leads",
            entities: linkedEntities("team", ledTeam ? [ledTeam] : []),
          },
        ]}
        blocker="Give the team another manager first, on the team's panel."
        onConfirm={() => setIsRoleChangeBlocked(false)}
        onClose={() => setIsRoleChangeBlocked(false)}
      />
    </>
  );
};

const UserDetailsView = ({ user }: { user: UserDetails }) => {
  const { user: viewer } = useAuth();
  const isOwner = viewer?.role === UserRole.OWNER;
  // Working hours are the owner's to read.
  const {
    capacity,
    isLoading: isLoadingCapacity,
    isError: isCapacityError,
    refetch: refetchCapacity,
  } = useUserCapacity(user.id, isOwner);
  const panel = useEntityPanel();
  const userActions = useUserActions();
  const projectChanges = useProjectLinkChanges();

  const isDeactivated = isDeactivatedUser(user);
  const lastDay = lastWorkingDayLabel(user);
  // Deactivating them from their row ends an open edit.
  const isEditing = panel.isEditing && userActions.canEdit(user);
  const canChangeProjects = !isDeactivated && !isEditing;
  // Team structure is the owner's; the owner is never a team's member.
  const canChangeTeam =
    isOwner && canChangeProjects && user.role !== UserRole.OWNER;
  const [isChangingTeam, setIsChangingTeam] = useState(false);
  const [removal, setRemoval] = useState<TeamRemoval | null>(null);
  // As on the team's panel: a manager removes members; managers are the owner's to remove.
  const canRemoveFromTeam = (team: UserTeam) =>
    !isEditing && (isOwner || team.roleInTeam === TeamRole.MEMBER);
  // Someone who leads their team moves once it has another manager.
  const ledTeam = user.team?.roleInTeam === TeamRole.MANAGER ? user.team : null;

  // Without their hours, a save could neither show nor keep them.
  const editForm = isLoadingCapacity ? (
    <LoadingState size="compact" />
  ) : isCapacityError || !capacity ? (
    <ErrorState
      size="compact"
      title="Could not load their working hours"
      onRetry={() => refetchCapacity()}
    />
  ) : (
    <UserEditForm user={user} capacity={capacity} />
  );

  if (canChangeProjects && panel.view === PROJECTS_PICKER) {
    return <UserProjectsPicker user={user} />;
  }

  return (
    <>
      <EntityPanelLayout
        name={fullName(user)}
        subtitle={user.position}
        leading={
          <Avatar
            user={user}
            size="md"
            className={cn(isDeactivated && "opacity-60")}
          />
        }
        status={
          isDeactivated && (
            <PanelStatus
              icon={UserX}
              label={
                lastDay ? (
                  <>
                    Deactivated. Last working day{" "}
                    <span className="font-medium text-foreground">
                      {lastDay}
                    </span>
                    .
                  </>
                ) : (
                  "Deactivated."
                )
              }
            />
          )
        }
        onEdit={
          userActions.canEdit(user) ? () => userActions.edit(user) : undefined
        }
        details={[
          { label: "Role", value: ROLE_LABELS[user.role] },
          ...(isOwner
            ? [
                {
                  label: "Working hours",
                  value: (
                    <WorkingHours
                      user={user}
                      capacity={capacity}
                      canCancelChanges={!isDeactivated && !isEditing}
                    />
                  ),
                },
              ]
            : []),
          { label: "Email", value: user.email },
        ]}
        actions={userActions.actionsFor(user)}
        // Only the person changes their own name, in their profile.
        editForm={isEditing && editForm}
      >
        {/* The owner is never in a team, so their panel has no team. */}
        {user.role !== UserRole.OWNER && (
          <PanelList
            title="Team"
            items={user.team ? [user.team] : []}
            getKey={(team) => team.id}
            renderRow={(team) => ({
              entity: { type: "team", id: team.id },
              name: team.name,
              detail: `${TEAM_ROLE_LABELS[team.roleInTeam]} since ${formatDayMonthYearLabel(team.joinedAt)}`,
              remove: canRemoveFromTeam(team)
                ? {
                    label: `Remove ${fullName(user)} from ${team.name}`,
                    onClick: () =>
                      setRemoval({ teamId: team.id, userId: user.id }),
                  }
                : undefined,
            })}
            emptyText={
              <>
                <ManageWarning inline>No team</ManageWarning>, so only the owner
                sees them.
              </>
            }
            note={
              canChangeTeam && ledTeam
                ? `Leads ${ledTeam.name}: give it another manager first to move them.`
                : undefined
            }
            add={
              canChangeTeam && !ledTeam
                ? {
                    label: user.team ? "Change team" : "Add to a team",
                    icon: user.team ? ArrowRightLeft : Plus,
                    onClick: () => setIsChangingTeam(true),
                  }
                : undefined
            }
          />
        )}

        <PanelList
          title="Projects"
          items={user.projects}
          getKey={(project) => project.id}
          renderRow={(project) => {
            // An archived project is read-only, so it keeps them.
            const isArchived = project.status === ProjectStatus.ARCHIVED;

            return {
              entity: { type: "project", id: project.id },
              name: project.name,
              isInactive: isArchived,
              status: isArchived && <StatusText>Archived</StatusText>,
              remove:
                canChangeProjects && !isArchived
                  ? {
                      label: `Remove ${fullName(user)} from ${project.name}`,
                      onClick: () =>
                        projectChanges.removeMember(project, {
                          id: user.id,
                          name: fullName(user),
                        }),
                    }
                  : undefined,
            };
          }}
          emptyText="Not on any projects yet."
          add={
            canChangeProjects
              ? {
                  label: "Add to projects",
                  icon: Plus,
                  onClick: () =>
                    panel.openView(PROJECTS_PICKER, fullName(user)),
                }
              : undefined
          }
        />
      </EntityPanelLayout>

      {userActions.dialogs}
      {projectChanges.dialogs}
      <UserChangeTeamDialog
        user={isChangingTeam ? user : null}
        currentTeam={user.team}
        onClose={() => setIsChangingTeam(false)}
      />
      <TeamMemberRemoveDialog
        removal={removal}
        onClose={() => setRemoval(null)}
      />
    </>
  );
};

export const UserPanel = ({ id }: { id: string }) => {
  const { user: viewer } = useAuth();
  const { data: user, isLoading, error, refetch } = useUserDetails(id);

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

  return <UserDetailsView user={user} />;
};
