"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, ClipboardList } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import {
  useActivitiesInfiniteQuery,
  useActivitiesMutations,
} from "@/hooks/useActivities";
import { hasManagerAccess } from "@/lib/utils/user";

import { ActivityListItem } from "@/types";
import { ActCategoryStatus, ActivityStatus } from "@/types/enums";

import {
  countLabel,
  ManageColumn,
  ManageList,
  ManageRowAction,
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { ActivityArchiveDialog } from "./ActivityArchiveDialog";
import { ActivityModal } from "./ActivityModal";
import { ActivityRestoreDialog } from "./ActivityRestoreDialog";

const projectsCount = (activity: ActivityListItem) =>
  activity.projectsCount ?? 0;

const COLUMNS: ManageColumn<ActivityListItem>[] = [
  {
    header: "Category",
    width: "w-48",
    cell: (activity) => activity.category.name,
  },
  {
    header: "Billable by default",
    width: "w-40",
    cell: (activity) => (activity.defaultBillable ? "Yes" : "No"),
    summary: (activity) =>
      activity.defaultBillable ? "Billable" : "Non-billable",
  },
  {
    header: "Projects",
    width: "w-24",
    numeric: true,
    cell: projectsCount,
    summary: (activity) =>
      countLabel(projectsCount(activity), "project", "projects"),
  },
];

export const ActivitiesContent = () => {
  const { isOnboarding, opensCreateForm } = useSetupLinkParams();
  const [createOpen, setCreateOpen] = useState(opensCreateForm);
  const [openedActivityId, setOpenedActivityId] = useState<string | null>(null);
  const [archivingActivity, setArchivingActivity] =
    useState<ActivityListItem | null>(null);
  const [restoringActivity, setRestoringActivity] =
    useState<ActivityListItem | null>(null);
  const listState = useManageListState();
  const status =
    listState.tab === "archived"
      ? ActivityStatus.ARCHIVED
      : ActivityStatus.ACTIVE;

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);
  const { unarchive } = useActivitiesMutations();

  const {
    items: activities,
    isLoading,
    isPlaceholderData,
    isError,
    refetch,
    pagination,
  } = useActivitiesInfiniteQuery(
    { status, search: listState.searchQuery },
    { keepPreviousData: true },
  );

  const openedActivity = activities.find(
    (activity) => activity.id === openedActivityId,
  );

  // An active activity needs an active category, so restoring one whose
  // category is archived asks what to do with it first.
  const restore = (activity: ActivityListItem) => {
    if (activity.category.status === ActCategoryStatus.ARCHIVED) {
      setRestoringActivity(activity);
      return;
    }

    unarchive.mutate(activity.id);
  };

  const actionsFor = (activity: ActivityListItem): ManageRowAction[] =>
    activity.status === ActivityStatus.ACTIVE
      ? [
          {
            label: "Archive",
            icon: Archive,
            destructive: true,
            onSelect: () => setArchivingActivity(activity),
          },
        ]
      : [
          {
            label: "Restore",
            icon: ArchiveRestore,
            onSelect: () => restore(activity),
          },
        ];

  return (
    <>
      <ResourcePage
        title="Activities"
        description="Manage activities that can be assigned to projects."
        listState={listState}
        itemCount={activities.length}
        isLoading={isLoading}
        isRefreshing={isPlaceholderData}
        isError={isError || !canManage}
        onRetry={refetch}
        searchPlaceholder="Search activities..."
        emptyTitle="No activities yet"
        emptyDescription="Create your first activity to start tracking work."
        emptyIcon={<ClipboardList className="size-6" />}
        createLabel="Create activity"
        onCreate={() => setCreateOpen(true)}
        canCreate={canManage}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
      >
        <ManageList
          label="Activities"
          items={activities}
          row={{
            getKey: (activity) => activity.id,
            getName: (activity) => activity.name,
            onOpen: (activity) => setOpenedActivityId(activity.id),
            columns: COLUMNS,
            getActions: actionsFor,
          }}
        />
      </ResourcePage>

      <ActivityModal
        isOnboarding={isOnboarding}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <ActivityModal
        isOnboarding={isOnboarding}
        open={Boolean(openedActivity)}
        onClose={() => setOpenedActivityId(null)}
        activity={openedActivity}
      />

      <ActivityArchiveDialog
        activity={archivingActivity}
        onClose={() => setArchivingActivity(null)}
      />

      {restoringActivity && (
        <ActivityRestoreDialog
          isOpen
          activity={restoringActivity}
          onClose={() => setRestoringActivity(null)}
          onRestored={() => setRestoringActivity(null)}
        />
      )}
    </>
  );
};
