"use client";

import { useState } from "react";
import { Activity, Check } from "lucide-react";

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
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { ActivityCreateDialog } from "./ActivityCreateDialog";
import { useActivityActions } from "./useActivityActions";

const projectsCount = (activity: ActivityListItem) =>
  activity.projectsCount ?? 0;

const categoryCell = (activity: ActivityListItem) => (
  <EntityLink
    entity={{ type: "category", id: activity.category.id }}
    tone="plain"
  >
    {activity.category.name}
  </EntityLink>
);

// Only billable activities carry a mark, so the column reads at a glance.
const BillableValue = ({ isBillable }: { isBillable: boolean }) =>
  isBillable ? (
    <span className="inline-flex items-center gap-1.5">
      <Check aria-hidden="true" className="size-3.5 text-brand" />
      Billable
    </span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );

const COLUMNS: ManageColumn<ActivityListItem>[] = [
  {
    header: "Category",
    width: "w-48",
    cell: categoryCell,
    summary: categoryCell,
  },
  {
    header: "Billable",
    width: "w-32",
    cell: (activity) => <BillableValue isBillable={activity.defaultBillable} />,
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
        listState={listState}
        itemCount={activities.length}
        isLoading={isLoading}
        isRefreshing={isPlaceholderData}
        isError={isError || !canManage}
        onRetry={refetch}
        searchPlaceholder="Search activities..."
        emptyTitle="No activities yet"
        emptyDescription="Create your first activity to start tracking work."
        emptyIcon={<Activity className="size-6" />}
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
