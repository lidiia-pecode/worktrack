"use client";

import Link from "next/link";

import { useAuth } from "@/hooks/auth/useAuth";
import { useActivitiesInfiniteQuery } from "@/hooks/useActivities";
import { useServerSearch } from "@/hooks/useManageListState";
import { createFirstLink, useIsOnboarding } from "@/hooks/useSetupLink";
import { useAssignableUsersInfiniteQuery } from "@/hooks/useUsers";
import { initials, fullName } from "@/lib/utils/user";
import { Activity, Project } from "@/types";
import { ActivityStatus, UserRole, UserStatus } from "@/types/enums";

import { PanelView } from "../entity-panel/EntityPanelLayout";
import { EntityPicker } from "../shared/resource/EntityPicker";
import type { useProjectLinkChanges } from "./useProjectLinkChanges";

export const PEOPLE_PICKER = "add-people";
export const ACTIVITIES_PICKER = "add-activities";

interface ProjectPickerProps {
  project: Project;
  changes: ReturnType<typeof useProjectLinkChanges>;
}

/** Offered activities, which a project's details list with their category. */
export const offeredActivities = (project: Project): Activity[] =>
  (project.projectActivities ?? [])
    .map((projectActivity) => projectActivity.activity)
    .filter((activity): activity is Activity => Boolean(activity));

export const ProjectPeoplePicker = ({
  project,
  changes,
}: ProjectPickerProps) => {
  const { user } = useAuth();
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useAssignableUsersInfiniteQuery(
    { status: UserStatus.ACTIVE, search: searchQuery },
    { keepPreviousData: true },
  );
  const memberIds = (project.users ?? []).map((member) => member.id);

  const toggle = (userId: string) => {
    const person = items.find((item) => item.id === userId);
    if (!person) return;

    if (memberIds.includes(userId)) changes.removeMember(person);
    else changes.addMember(userId);
  };

  return (
    <PanelView
      title={`Add people to ${project.name}`}
      description={
        user?.role === UserRole.OWNER
          ? "Each choice saves at once. Choose someone again to remove them."
          : "Each choice saves at once. You can add yourself and people in teams you manage."
      }
    >
      <EntityPicker
        items={items}
        selectedIds={memberIds}
        onToggle={toggle}
        getId={(person) => person.id}
        getLabel={fullName}
        getSubtitle={(person) => person.email}
        getAvatarText={initials}
        onSearchChange={setSearch}
        isLoading={isLoading}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
        emptyMessage="Nobody to add yet."
        searchPlaceholder="Search people..."
      />
    </PanelView>
  );
};

export const ProjectActivitiesPicker = ({
  project,
  changes,
}: ProjectPickerProps) => {
  const isOnboarding = useIsOnboarding();
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useActivitiesInfiniteQuery(
    { status: ActivityStatus.ACTIVE, search: searchQuery },
    { keepPreviousData: true },
  );
  const offeredIds = offeredActivities(project).map((activity) => activity.id);

  const toggle = (activityId: string) => {
    const activity = items.find((item) => item.id === activityId);
    if (!activity) return;

    if (offeredIds.includes(activityId)) changes.removeActivity(activity);
    else changes.addActivity(activityId);
  };

  return (
    <PanelView
      title={`Add activities to ${project.name}`}
      description="People on the project log time against these. Each choice saves at once."
    >
      <EntityPicker
        items={items}
        selectedIds={offeredIds}
        onToggle={toggle}
        getId={(activity) => activity.id}
        getLabel={(activity) => activity.name}
        getSubtitle={(activity) => activity.category?.name}
        onSearchChange={setSearch}
        isLoading={isLoading}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
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
    </PanelView>
  );
};
