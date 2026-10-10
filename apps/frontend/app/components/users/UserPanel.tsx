"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useAuth";
import { useSetCapacity, useUserCapacity } from "@/hooks/useCapacity";
import { useUserDetails, useUsersMutations } from "@/hooks/useUsers";
import { ROLE_LABELS, TEAM_ROLE_LABELS } from "@/lib/constants";
import { formatDayMonthYearLabel, todayISODate } from "@/lib/utils/date";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Capacity, UserDetails } from "@/types";
import { ProjectStatus, TeamRole, UserRole } from "@/types/enums";

import { EntityLink } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelDetail,
  PanelDetails,
  PanelEditForm,
  PanelList,
  PanelQueryState,
  PanelRemoveButton,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { ImpactDialog } from "../shared/ImpactDialog";
import { LoadingState } from "../shared/LoadingState";
import { ManageWarning } from "../shared/resource/ManageList";
import { useUserActions } from "./useUserActions";
import { describeCapacity, UserForm, UserFormData } from "./UserForm";
import {
  PROJECTS_PICKER,
  UserProjectsPicker,
  useUserProjectChanges,
} from "./UserProjectsPicker";

const EDIT_FORM_ID = "user-edit-form";

interface UserEditFormProps {
  user: UserDetails;
  capacity: Capacity | null;
}

const UserEditForm = ({ user, capacity }: UserEditFormProps) => {
  const panel = useEntityPanel();
  const { update } = useUsersMutations();
  const setCapacity = useSetCapacity();
  const [isRoleChangeBlocked, setIsRoleChangeBlocked] = useState(false);

  // A Manager who leads a team stays one until the team has another manager;
  // the API refuses too, but saying so first names the teams.
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
          onSubmit={(data) => void save(data)}
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
            entities: managedTeams.map((team) => ({
              entity: { type: "team", id: team.id },
              name: team.name,
            })),
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
  const projectChanges = useUserProjectChanges(user);

  const isDeactivated = isDeactivatedUser(user);
  // Deactivating them elsewhere, such as from their row, ends the edit.
  const isEditing = panel.isEditing && userActions.canEdit(user);
  // A deactivated person is read-only.
  const canChangeProjects = !isDeactivated && !isEditing;

  if (canChangeProjects && panel.view === PROJECTS_PICKER) {
    return (
      <>
        <UserProjectsPicker user={user} changes={projectChanges} />
        {projectChanges.dialogs}
      </>
    );
  }

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
        isEditing={isEditing}
      >
        {!isEditing ? (
          <PanelDetails details={details} />
        ) : isLoadingCapacity ? (
          <LoadingState size="compact" />
        ) : (
          <UserEditForm user={user} capacity={capacity} />
        )}

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
            // An archived project is read-only, so it keeps them.
            badge:
              project.status === ProjectStatus.ARCHIVED ? (
                <Badge variant="neutral">Archived</Badge>
              ) : (
                canChangeProjects && (
                  <PanelRemoveButton
                    label={`Remove ${fullName(user)} from ${project.name}`}
                    onClick={() => projectChanges.removeFromProject(project)}
                  />
                )
              ),
          })}
          emptyText="Not on any projects yet."
          action={
            canChangeProjects && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => panel.openView(PROJECTS_PICKER, fullName(user))}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                Add to projects
              </Button>
            )
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
