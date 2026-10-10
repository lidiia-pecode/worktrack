"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/auth/useAuth";
import { useSetCapacity, useUserCapacity } from "@/hooks/useCapacity";
import { useUserDetails, useUsersMutations } from "@/hooks/useUsers";
import { ROLE_LABELS, TEAM_ROLE_LABELS } from "@/lib/constants";
import {
  formatDayMonthYearLabel,
  formatDuration,
  todayISODate,
} from "@/lib/utils/date";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Capacity, UserDetails } from "@/types";
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
import { ImpactDialog } from "../shared/ImpactDialog";
import { LoadingState } from "../shared/LoadingState";
import { ManageWarning } from "../shared/resource/ManageList";
import { useUserActions } from "./useUserActions";
import { UserForm, UserFormData } from "./UserForm";
import { PROJECTS_PICKER } from "../projects/ProjectChoicesPicker";
import { useProjectLinkChanges } from "../projects/useProjectLinkChanges";
import { UserProjectsPicker } from "./UserProjectsPicker";

const EDIT_FORM_ID = "user-edit-form";

const WorkingHours = ({ capacity }: { capacity: Capacity | null }) => {
  if (!capacity) {
    return <span className="text-muted-foreground">Not set</span>;
  }

  const source = capacity.isCompanyDefault
    ? "company default"
    : capacity.validFrom &&
      `since ${formatDayMonthYearLabel(capacity.validFrom)}`;

  return (
    <>
      {formatDuration(capacity.minutesPerWeek)} a week
      {source && <span className="text-muted-foreground"> · {source}</span>}
    </>
  );
};

interface UserEditFormProps {
  user: UserDetails;
  capacity: Capacity | null;
}

const UserEditForm = ({ user, capacity }: UserEditFormProps) => {
  const panel = useEntityPanel();
  const { update } = useUsersMutations();
  const setCapacity = useSetCapacity();
  const [isRoleChangeBlocked, setIsRoleChangeBlocked] = useState(false);

  // A team's manager can't become an Employee. The API refuses too, but checking here lets the dialog name the teams.
  const managedTeams = user.teams.filter(
    (team) => team.roleInTeam === TeamRole.MANAGER,
  );

  const save = async (data: UserFormData) => {
    const { capacityHoursPerWeek, capacityValidFrom, ...userData } = data;

    const becomesEmployee =
      user.role === UserRole.MANAGER && userData.role === UserRole.EMPLOYEE;
    if (becomesEmployee && managedTeams.length > 0) {
      setIsRoleChangeBlocked(true);
      return;
    }

    const minutesPerWeek = Math.round(capacityHoursPerWeek * 60);
    const hoursChanged =
      capacity !== null && minutesPerWeek !== capacity.minutesPerWeek;

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
          defaultValues={{
            position: user.position ?? "",
            role: user.role,
            capacityHoursPerWeek: (capacity?.minutesPerWeek ?? 0) / 60,
            capacityValidFrom: todayISODate(),
          }}
          onSubmit={save}
          onDirtyChange={panel.setHasUnsavedChanges}
        />
      </PanelEditForm>

      <ImpactDialog
        isOpen={isRoleChangeBlocked}
        title={`${fullName(user)} still manages ${managedTeams.length === 1 ? "a team" : "teams"}`}
        description="A Manager who leads a team can't become an Employee."
        affected={[
          {
            label: "Manages",
            entities: linkedEntities("team", managedTeams),
          },
        ]}
        blocker="Make someone else the manager of these teams first, or make them a member."
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
  const { capacity, isLoading: isLoadingCapacity } = useUserCapacity(
    user.id,
    isOwner,
  );
  const panel = useEntityPanel();
  const userActions = useUserActions();
  const projectChanges = useProjectLinkChanges();

  const isDeactivated = isDeactivatedUser(user);
  // Deactivating them from their row ends an open edit.
  const isEditing = panel.isEditing && userActions.canEdit(user);
  const canChangeProjects = !isDeactivated && !isEditing;

  if (canChangeProjects && panel.view === PROJECTS_PICKER) {
    return <UserProjectsPicker user={user} />;
  }

  return (
    <>
      <EntityPanelLayout
        type="Person"
        name={fullName(user)}
        subtitle={user.position}
        status={
          <PanelStatus isActive={!isDeactivated} inactiveLabel="Deactivated" />
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
                  value: <WorkingHours capacity={capacity} />,
                },
              ]
            : []),
          { label: "Email", value: user.email, wide: true },
        ]}
        actions={userActions.actionsFor(user)}
        // Only the person changes their own name, in their profile.
        editForm={
          isEditing &&
          (isLoadingCapacity ? (
            <LoadingState size="compact" />
          ) : (
            <UserEditForm user={user} capacity={capacity} />
          ))
        }
      >
        <PanelList
          title="Team"
          items={user.teams}
          getKey={(team) => team.id}
          renderRow={(team) => ({
            entity: { type: "team", id: team.id },
            name: team.name,
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
          renderRow={(project) => {
            // An archived project is read-only, so it keeps them.
            const isArchived = project.status === ProjectStatus.ARCHIVED;

            return {
              entity: { type: "project", id: project.id },
              name: project.name,
              isInactive: isArchived,
              status: isArchived && <Badge variant="neutral">Archived</Badge>,
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
