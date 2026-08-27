"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Archive, ArchiveRestore, ArrowLeft, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useActivitiesInfiniteQuery } from "@/hooks/useActivities";
import { useProjects } from "@/hooks/useProjects";
import { useUsersInfiniteQuery } from "@/hooks/useUsers";

import { Project } from "@/types";
import { ProjectStatus, UserRole } from "@/types/enums";

import { fullName, getNonAdminMemberIds, initials } from "@/lib/utils/user";
import { toggleSelection } from "@/lib/utils/toggle-selection";

import { ResourceFormModal } from "../shared/resourse/ResourceFormModal";
import { EntityPicker } from "../shared/resourse/EntityPicker";

import { ProjectForm, ProjectFormData } from "./ProjectForm";

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  project?: Project;
  isOnboarding?: boolean;
}

type View = "form" | "members" | "activities";

const FORM_ID = "project-form";

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const byId = new Map<string, T>();

  for (const item of items) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values());
}

export function ProjectModal({
  open,
  onClose,
  project,
  isOnboarding = false,
}: ProjectModalProps) {
  const router = useRouter();
  const [view, setView] = useState<View>("form");

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    () => project?.users?.map((user) => user.id) ?? [],
  );

  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>(
    () =>
      project?.projectActivities
        ?.map((projectActivity) => projectActivity.activity?.id)
        .filter((id): id is string => Boolean(id)) ?? [],
  );

  const {
    actions: { create, update, archive, unarchive },
  } = useProjects();

  const { items: rawUsers, isLoading: isUsersLoading } =
    useUsersInfiniteQuery();

  const { items: rawActivities, isLoading: isActivitiesLoading } =
    useActivitiesInfiniteQuery();

  const users = useMemo(() => dedupeById(rawUsers), [rawUsers]);
  const activities = useMemo(() => dedupeById(rawActivities), [rawActivities]);

  const isArchived = project?.status === ProjectStatus.ARCHIVED;
  const isPicking = view !== "form";
  const isSubmitting = create.isPending || update.isPending;

  const employees = useMemo(
    () => users.filter((user) => user.role === UserRole.EMPLOYEE),
    [users],
  );

  const selectedUsers = useMemo(
    () => employees.filter((user) => selectedUserIds.includes(user.id)),
    [employees, selectedUserIds],
  );

  const selectedActivities = useMemo(
    () =>
      activities.filter((activity) =>
        selectedActivityIds.includes(activity.id),
      ),
    [activities, selectedActivityIds],
  );

  const handleClose = () => {
    setView("form");
    setSelectedUserIds([]);
    setSelectedActivityIds([]);
    onClose();
  };

  const handleSubmit = (data: ProjectFormData) => {
    const payload = {
      ...data,
      userIds: getNonAdminMemberIds(users, selectedUserIds),
      activityIds: Array.from(new Set(selectedActivityIds)),
    };

    if (project) {
      update.mutate({ id: project.id, data: payload }, { onSuccess: onClose });
      return;
    }

    create.mutate(payload, {
      onSuccess: () => {
        onClose();

        if (isOnboarding) {
          router.push("/");
        }
      },
    });
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((current) => toggleSelection(current, userId));
  };

  const handleToggleActivity = (activityId: string) => {
    setSelectedActivityIds((current) => toggleSelection(current, activityId));
  };

  const handleApplyPicker = () => {
    setView("form");
  };

  const handleArchive = () => {
    if (!project) return;
    archive.mutate(project.id);
  };

  const handleUnarchive = () => {
    if (!project) return;
    unarchive.mutate(project.id);
  };

  const title =
    view === "members"
      ? "Add members"
      : view === "activities"
        ? "Add activities"
        : (project?.name ?? "Create project");

  const description =
    view === "members"
      ? "Select people to add to this project."
      : view === "activities"
        ? "Select activities available for this project."
        : project
          ? "Update project details and manage its members and activities."
          : "Create a project to organize work and manage access.";

  return (
    <ResourceFormModal
      open={open}
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

            <Button type="button" size="sm" onClick={handleApplyPicker}>
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
            {project ? (
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

              <Button
                type="submit"
                form={FORM_ID}
                size="sm"
                isLoading={isSubmitting}
              >
                {project ? "Save changes" : "Create project"}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className={view === "activities" ? "px-6 py-5" : "hidden"}>
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

      <div className={view === "members" ? "px-6 py-5" : "hidden"}>
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

      <div className={view === "form" ? "space-y-6" : "hidden"}>
        <ProjectForm
          formId={FORM_ID}
          mode={project ? "edit" : "create"}
          defaultValues={{
            name: project?.name ?? "",
            description: project?.description ?? "",
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
                  ? project
                    ? "person assigned"
                    : "person selected"
                  : project
                    ? "people assigned"
                    : "people selected"}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setView("members")}
            >
              Add members
            </Button>
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
                  ? project
                    ? "activity assigned"
                    : "activity selected"
                  : project
                    ? "activities assigned"
                    : "activities selected"}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setView("activities")}
            >
              Add activities
            </Button>
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
    </ResourceFormModal>
  );
}
