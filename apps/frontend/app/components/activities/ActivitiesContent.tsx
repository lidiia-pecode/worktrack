"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import { useActivitiesInfiniteQuery } from "@/hooks/useActivities";
import { hasManagerAccess } from "@/lib/utils/user";

import { ActivityListItem } from "@/types";
import { ActivityStatus } from "@/types/enums";

import { EntityLink } from "../entity-panel/EntityLink";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import {
  countLabel,
  ManageColumn,
  ManageCount,
  ManageList,
  ManageWarning,
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { ActivityCreateDialog } from "./ActivityCreateDialog";
import { useActivityActions } from "./useActivityActions";

const projectsCount = (activity: ActivityListItem) =>
  activity.projectsCount ?? 0;

// A draft has no category, so it cannot go on a project until it gets one.
const NO_CATEGORY = "No category";

const CategoryLink = ({ activity }: { activity: ActivityListItem }) =>
  activity.category && (
    <EntityLink
      entity={{ type: "category", id: activity.category.id }}
      tone="plain"
    >
      {activity.category.name}
    </EntityLink>
  );

const COLUMNS: ManageColumn<ActivityListItem>[] = [
  {
    header: "Category",
    width: "w-48",
    cell: (activity) =>
      activity.category ? (
        <CategoryLink activity={activity} />
      ) : (
        <ManageWarning>{NO_CATEGORY}</ManageWarning>
      ),
    summary: (activity) =>
      activity.category ? (
        <CategoryLink activity={activity} />
      ) : (
        <ManageWarning inline>{NO_CATEGORY}</ManageWarning>
      ),
  },
  {
    header: "Billable by default",
    width: "w-40",
    // Yes carries a dot so the billable rows can be picked out down the column.
    cell: (activity) =>
      activity.defaultBillable ? (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-success"
          />
          Yes
        </span>
      ) : (
        <span className="text-muted-foreground">No</span>
      ),
    summary: (activity) =>
      activity.defaultBillable ? "Billable" : "Non-billable",
  },
  {
    header: "Projects",
    width: "w-24",
    numeric: true,
    cell: (activity) => <ManageCount count={projectsCount(activity)} />,
    summary: (activity) =>
      countLabel(projectsCount(activity), "project", "projects"),
  },
];

export const ActivitiesContent = () => {
  const { isOnboarding, opensCreateForm } = useSetupLinkParams();
  const [createOpen, setCreateOpen] = useState(opensCreateForm);
  const listState = useManageListState();
  const panel = useEntityPanel();
  const activityActions = useActivityActions();
  const status =
    listState.tab === "archived"
      ? ActivityStatus.ARCHIVED
      : ActivityStatus.ACTIVE;

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

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
            getEntity: (activity) => ({ type: "activity", id: activity.id }),
            onEdit: activityActions.edit,
            canEdit: activityActions.canEdit,
            columns: COLUMNS,
            getActions: activityActions.actionsFor,
          }}
        />
      </ResourcePage>

      <ActivityCreateDialog
        isOnboarding={isOnboarding}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(activity) =>
          panel.open({ type: "activity", id: activity.id })
        }
      />

      {activityActions.dialogs}
    </>
  );
};
