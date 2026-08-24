"use client";

import { useState } from "react";

import { Archive, ArchiveRestore, ArrowLeft, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Project } from "@/types";
import { ProjectStatus, UserRole } from "@/types/enums";

import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { useActivities } from "@/hooks/useActivities";

import { fullName, getNonAdminMemberIds, initials } from "@/lib/utils/user";

import { ProjectForm, ProjectFormData } from "./ProjectForm";
import { ResourceFormModal } from "../shared/resourse/ResourceFormModal";
import { EntityPicker } from "../shared/resourse/EntityPicker";

interface UpdateProjectModalProps {
  project: Project;
  canManage: boolean;
  onClose: () => void;
}

type View = "form" | "members" | "activities";

const FORM_ID = "project-details-form";

export function UpdateProjectModal({
  project,
  canManage,
  onClose,
}: UpdateProjectModalProps) {
  const [view, setView] = useState<View>("form");

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    () => project.users?.map((user) => user.id) ?? [],
  );

  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>(
    () =>
      project.projectActivities?.map(
        (projectActivity) => projectActivity.activityId,
      ) ?? [],
  );

  const {
    actions: { update, archive, unarchive },
  } = useProjects();

  const { items: allUsers = [], isLoading: isUsersLoading } = useUsers();

  const { items: activities = [], isLoading: isActivitiesLoading } =
    useActivities();

  const isArchived = project.status === ProjectStatus.ARCHIVED;

  const isSubmitting = update.isPending;

  const isPicking = view !== "form";

  const employees = allUsers.filter((user) => user.role === UserRole.EMPLOYEE);

  const selectedUsers = employees.filter((user) =>
    selectedUserIds.includes(user.id),
  );

  const selectedActivities = activities.filter((activity) =>
    selectedActivityIds.includes(activity.id),
  );

  const handleSubmit = (data: ProjectFormData) => {
    update.mutate(
      {
        id: project.id,
        data: {
          ...data,
          userIds: getNonAdminMemberIds(allUsers, selectedUserIds),
          activityIds: selectedActivityIds,
        },
      },
      {
        onSuccess: onClose,
      },
    );
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleToggleActivity = (activityId: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId],
    );
  };

  const handleApplyMembers = () => {
    update.mutate(
      {
        id: project.id,
        data: {
          userIds: getNonAdminMemberIds(allUsers, selectedUserIds),
        },
      },
      {
        onSuccess: () => {
          setView("form");
        },
      },
    );
  };

  const handleApplyActivities = () => {
    update.mutate(
      {
        id: project.id,
        data: {
          activityIds: selectedActivityIds,
        },
      },
      {
        onSuccess: () => {
          setView("form");
        },
      },
    );
  };

  const handleArchive = () => {
    archive.mutate(project.id);
  };

  const handleUnarchive = () => {
    unarchive.mutate(project.id);
  };

  const handleClose = () => {
    setView("form");
    onClose();
  };

  const title =
    view === "members"
      ? "Add members"
      : view === "activities"
        ? "Add activities"
        : project.name;

  const description =
    view === "members"
      ? "Select people to add to this project."
      : view === "activities"
        ? "Select activities available for this project."
        : "Update project details and manage its members and activities.";

  return (
    <ResourceFormModal
      open
      onClose={handleClose}
      size="lg"
      bodyPadding={!isPicking}
      title={title}
      description={description}
      icon={isPicking ? undefined : <FolderKanban className="size-5" />}
      footer={
        isPicking ? (
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setView("form")}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={
                view === "members" ? handleApplyMembers : handleApplyActivities
              }
              isLoading={isSubmitting}
            >
              Apply
              {view === "members" && selectedUserIds.length > 0
                ? ` (${selectedUserIds.length})`
                : ""}
              {view === "activities" && selectedActivityIds.length > 0
                ? ` (${selectedActivityIds.length})`
                : ""}
            </Button>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            {canManage ? (
              <Button
                type="button"
                variant={isArchived ? "success" : "destructive"}
                size="sm"
                className="gap-1.5"
                onClick={isArchived ? handleUnarchive : handleArchive}
                isLoading={archive.isPending || unarchive.isPending}
              >
                {isArchived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}

                {isArchived ? "Unarchive" : "Archive"}
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                Cancel
              </Button>

              {canManage && (
                <Button
                  type="submit"
                  form={FORM_ID}
                  size="sm"
                  isLoading={isSubmitting}
                >
                  Save changes
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      {view === "members" ? (
        <div className="px-6 py-5">
          <EntityPicker
            items={employees}
            selectedIds={selectedUserIds}
            onToggle={handleToggleUser}
            getId={(user) => user.id}
            getLabel={fullName}
            getSubtitle={(user) => user.email}
            getAvatarText={initials}
            isLoading={isUsersLoading}
            emptyMessage="No available users found."
            searchPlaceholder="Search people..."
          />
        </div>
      ) : view === "activities" ? (
        <div className="px-6 py-5">
          <EntityPicker
            items={activities}
            selectedIds={selectedActivityIds}
            onToggle={handleToggleActivity}
            getId={(activity) => activity.id}
            getLabel={(activity) => activity.name}
            getSubtitle={(activity) => activity.category?.name}
            isLoading={isActivitiesLoading}
            emptyMessage="No activities found."
            searchPlaceholder="Search activities..."
          />
        </div>
      ) : (
        <div className="space-y-6">
          <ProjectForm
            formId={FORM_ID}
            mode="edit"
            defaultValues={{
              name: project.name,
              description: project.description ?? "",
              status: project.status,
            }}
            membersCount={selectedUsers.length}
            activitiesCount={selectedActivities.length}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Team members
                </h3>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedUsers.length}{" "}
                  {selectedUsers.length === 1
                    ? "person assigned"
                    : "people assigned"}
                </p>
              </div>

              {canManage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setView("members")}
                >
                  Add members
                </Button>
              )}
            </div>

            {selectedUsers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                  >
                    {fullName(user)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Project activities
                </h3>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedActivities.length}{" "}
                  {selectedActivities.length === 1
                    ? "activity assigned"
                    : "activities assigned"}
                </p>
              </div>

              {canManage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setView("activities")}
                >
                  Add activities
                </Button>
              )}
            </div>

            {selectedActivities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                  >
                    {activity.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ResourceFormModal>
  );
}
