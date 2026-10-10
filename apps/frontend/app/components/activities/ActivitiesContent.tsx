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
import { countLabel } from "@/lib/utils/text";

import { EntityLink } from "../entity-panel/EntityLink";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import {
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

const categoryCell = (activity: ActivityListItem, inline = false) =>
  activity.category ? (
    <EntityLink
      entity={{ type: "category", id: activity.category.id }}
      tone="plain"
    >
      {activity.category.name}
    </EntityLink>
  ) : (
    <ManageWarning inline={inline}>No category</ManageWarning>
  );

const COLUMNS: ManageColumn<ActivityListItem>[] = [
  {
    header: "Category",
    width: "w-48",
    cell: (activity) => categoryCell(activity),
    summary: (activity) => categoryCell(activity, true),
  },
  {
    header: "Billable by default",
    width: "w-40",
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
  } = useActivitiesInfiniteQuery({ status, search: listState.searchQuery });

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
