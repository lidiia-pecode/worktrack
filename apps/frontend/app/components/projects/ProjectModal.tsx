"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { GETTING_STARTED_PATH } from "@/lib/constants";
import { createFirstLink } from "@/hooks/useSetupLink";

import { Archive, ArchiveRestore, ArrowLeft, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useActivitiesInfiniteQuery } from "@/hooks/useActivities";
import {
  useClientNameSuggestions,
  useProjectDetails,
  useProjectsMutations,
} from "@/hooks/useProjects";
import { useAssignableUsersInfiniteQuery } from "@/hooks/useUsers";
import { usePlanningRemovalGuard } from "@/hooks/usePlanningRemovalGuard";

import { Activity, Project } from "@/types";
import { ActivityStatus, ProjectStatus, UserStatus } from "@/types/enums";

import { fullName, initials, isDeactivatedUser } from "@/lib/utils/user";
import { toggleSelection } from "@/lib/utils/toggle-selection";

import { ResourceFormModal } from "../shared/resource/ResourceFormModal";
import { ConfirmModal } from "../shared/ConfirmModal";
import { EntityPicker } from "../shared/resource/EntityPicker";

import { ProjectArchiveDialog } from "./ProjectArchiveDialog";
import { ProjectForm, ProjectFormData } from "./ProjectForm";
import { ProjectMembersSection } from "./ProjectMembersSection";
import { ProjectActivitiesSection } from "./ProjectActivitiesSection";

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

export const ProjectModal = ({
  open,
  onClose,
  project,
  isOnboarding = false,
}: ProjectModalProps) => {
  const router = useRouter();
  const [view, setView] = useState<View>("form");
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);

  const { data: projectDetails, isLoading: isDetailsLoading } =
    useProjectDetails(project?.id);

  const [pickedUserIds, setPickedUserIds] = useState<string[] | null>(null);

  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>(
    () =>
      project?.projectActivities
        ?.map((projectActivity) => projectActivity.activity?.id)
        .filter((id): id is string => Boolean(id)) ?? [],
  );

  const { create, update, unarchive } = useProjectsMutations();
  const clientSuggestions = useClientNameSuggestions();

  const { confirmRemoval, isChecking, confirmProps } =
    usePlanningRemovalGuard();

  const {
    items: rawUsers,
    isLoading: isUsersLoading,
    pagination: usersPagination,
  } = useAssignableUsersInfiniteQuery({
    status: UserStatus.ACTIVE,
  });

  const {
    items: rawActivities,
    isLoading: isActivitiesLoading,
    pagination: activitiesPagination,
  } = useActivitiesInfiniteQuery({
    status: ActivityStatus.ACTIVE,
  });

  const savedMembers = useMemo(
    () => projectDetails?.users ?? [],
    [projectDetails],
  );

  const savedUserIds = useMemo(
    () => savedMembers.map((user) => user.id),
    [savedMembers],
  );

  const hiddenMembersCount = Math.max(
    (projectDetails?.membersCount ?? 0) - savedUserIds.length,
    0,
  );

  const selectedUserIds = pickedUserIds ?? savedUserIds;

  const isMembersLoading = isDetailsLoading || isUsersLoading;

  const users = useMemo(
    () => dedupeById([...savedMembers, ...rawUsers]),
    [savedMembers, rawUsers],
  );

  const offeredActivities = useMemo(
    () =>
      (projectDetails ?? project)?.projectActivities
        ?.map((projectActivity) => projectActivity.activity)
        .filter((activity): activity is Activity => Boolean(activity)) ?? [],
    [projectDetails, project],
  );

  // The project's own activities come first, as its members do, so one that is
  // not on the catalogue pages loaded so far still shows.
  const activities = useMemo(
    () => dedupeById([...offeredActivities, ...rawActivities]),
    [offeredActivities, rawActivities],
  );

  const isArchived = project?.status === ProjectStatus.ARCHIVED;
  const isPicking = view !== "form";
  const isSubmitting = create.isPending || update.isPending;

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.id)),
    [users, selectedUserIds],
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
    setPickedUserIds(null);
    setSelectedActivityIds([]);
    onClose();
  };

  const handleSaved = () => {
    handleClose();

    if (isOnboarding) {
      router.push(GETTING_STARTED_PATH);
    }
  };

  const handleSubmit = (data: ProjectFormData) => {
    const payload = {
      ...data,
      userIds: selectedUserIds,
      activityIds: Array.from(new Set(selectedActivityIds)),
    };

    if (project) {
      const removedIds = savedUserIds.filter(
        (id) => !selectedUserIds.includes(id),
      );

      void confirmRemoval({
        projectIds: [project.id],
        userIds: removedIds,
        title: `Remove ${removedIds.length} ${
          removedIds.length === 1 ? "person" : "people"
        } from ${project.name}?`,
        proceed: () =>
          update.mutate(
            { id: project.id, data: payload },
            { onSuccess: handleSaved },
          ),
      });
      return;
    }

    create.mutate(payload, { onSuccess: handleSaved });
  };

  const handleToggleUser = (userId: string) => {
    setPickedUserIds(toggleSelection(selectedUserIds, userId));
  };

  const handleToggleActivity = (activityId: string) => {
    setSelectedActivityIds((current) => toggleSelection(current, activityId));
  };

  const handleRemoveUser = (userId: string) => {
    setPickedUserIds(toggleSelection(selectedUserIds, userId));
  };

  const handleRemoveActivity = (activityId: string) => {
    setSelectedActivityIds((current) => toggleSelection(current, activityId));
  };

  const handleApplyPicker = () => {
    setView("form");
  };

  const handleArchive = () => setIsConfirmingArchive(true);

  const handleUnarchive = () => {
    if (!project) return;
    unarchive.mutate(project.id, { onSuccess: onClose });
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
    <>
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
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setView("form")}
                className="mr-auto gap-1.5"
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
            </>
          ) : (
            <>
              {project && (
                <Button
                  type="button"
                  variant={isArchived ? "success" : "destructive"}
                  size="sm"
                  className="mr-auto gap-1.5"
                  onClick={isArchived ? handleUnarchive : handleArchive}
                  isLoading={unarchive.isPending}
                >
                  {isArchived ? (
                    <ArchiveRestore className="size-4" />
                  ) : (
                    <Archive className="size-4" />
                  )}
                  {isArchived ? "Restore" : "Archive"}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                form={FORM_ID}
                size="sm"
                isLoading={isSubmitting || isChecking}
                disabled={isMembersLoading}
              >
                {project ? "Save changes" : "Create project"}
              </Button>
            </>
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
            hasNextPage={activitiesPagination.hasNextPage}
            isFetchingNextPage={activitiesPagination.isFetchingNextPage}
            onFetchNextPage={activitiesPagination.fetchNextPage}
            emptyMessage={
              <>
                No activities yet. Projects are logged against them, so{" "}
                <Link
                  href={createFirstLink("/admin/activities", isOnboarding)}
                  className="font-medium text-brand hover:underline"
                >
                  create an activity first
                </Link>
                .
              </>
            }
            searchPlaceholder="Search activities..."
          />
        </div>

        <div className={view === "members" ? "px-6 py-5" : "hidden"}>
          <EntityPicker
            items={users}
            selectedIds={selectedUserIds}
            onToggle={handleToggleUser}
            getId={(user) => user.id}
            getLabel={fullName}
            getSubtitle={(user) =>
              isDeactivatedUser(user)
                ? `${user.email} · Deactivated`
                : user.email
            }
            getAvatarText={initials}
            isLoading={isUsersLoading}
            hasNextPage={usersPagination.hasNextPage}
            isFetchingNextPage={usersPagination.isFetchingNextPage}
            onFetchNextPage={usersPagination.fetchNextPage}
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
              clientName: project?.clientName ?? null,
              description: project?.description ?? "",
            }}
            clientSuggestions={clientSuggestions}
            membersCount={selectedUsers.length + hiddenMembersCount}
            activitiesCount={selectedActivities.length}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />

          <div className="border-t border-border pt-6">
            <ProjectMembersSection
              members={selectedUsers}
              hiddenCount={hiddenMembersCount}
              isLoading={isMembersLoading}
              isCreateMode={!project}
              onOpenAddMembers={() => setView("members")}
              onRemoveMember={handleRemoveUser}
            />
          </div>

          <div className="border-t border-border pt-6">
            <ProjectActivitiesSection
              activities={selectedActivities}
              isCreateMode={!project}
              onOpenAddActivities={() => setView("activities")}
              onRemoveActivity={handleRemoveActivity}
            />
          </div>
        </div>
      </ResourceFormModal>

      <ConfirmModal {...confirmProps} />

      <ProjectArchiveDialog
        project={isConfirmingArchive && project ? project : null}
        onClose={() => setIsConfirmingArchive(false)}
        onArchived={onClose}
      />
    </>
  );
};
