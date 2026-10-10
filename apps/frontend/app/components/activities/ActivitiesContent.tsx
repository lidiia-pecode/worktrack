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
  ManageList,
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { ActivityModal } from "./ActivityModal";
import { useActivityActions } from "./useActivityActions";

const projectsCount = (activity: ActivityListItem) =>
  activity.projectsCount ?? 0;

const CategoryLink = ({ activity }: { activity: ActivityListItem }) => (
  <EntityLink entity={{ type: "category", id: activity.category.id }}>
    {activity.category.name}
  </EntityLink>
);

const COLUMNS: ManageColumn<ActivityListItem>[] = [
  {
    header: "Category",
    width: "w-48",
    cell: (activity) => <CategoryLink activity={activity} />,
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
            onOpen: (activity) =>
              panel.open({ type: "activity", id: activity.id }),
            onEdit: activityActions.edit,
            canEdit: activityActions.canEdit,
            columns: COLUMNS,
            getActions: activityActions.actionsFor,
          }}
        />
      </ResourcePage>

      <ActivityModal
        isOnboarding={isOnboarding}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {activityActions.dialogs}
    </>
  );
};
