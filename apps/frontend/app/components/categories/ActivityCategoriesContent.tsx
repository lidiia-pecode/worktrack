"use client";

import { useState } from "react";
import { FolderTree } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import { useActivityCategoriesInfiniteQuery } from "@/hooks/useActivityCategories";
import { hasManagerAccess } from "@/lib/utils/user";

import { ActivityCategoryListItem } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { EntityLinks, linkedEntities } from "../entity-panel/EntityLink";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import {
  ManageColumn,
  ManageCount,
  ManageList,
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { CategoryCreateDialog } from "./CategoryCreateDialog";
import { useCategoryActions } from "./useCategoryActions";

const NO_ACTIVITIES = "No active activities";

const onProjectsCount = (category: ActivityCategoryListItem) =>
  category.onProjectsCount ?? 0;

const FirstActivityLinks = ({
  category,
}: {
  category: ActivityCategoryListItem;
}) => (
  <EntityLinks
    tone="plain"
    entities={linkedEntities("activity", category.firstActivities)}
  />
);

const MoreActivities = ({
  category,
}: {
  category: ActivityCategoryListItem;
}) => {
  const moreCount = category.activitiesCount - category.firstActivities.length;

  if (moreCount <= 0) return null;

  return (
    <span className="ml-1 shrink-0 text-muted-foreground">
      +{moreCount}
      <span className="sr-only"> more</span>
    </span>
  );
};

const COLUMNS: ManageColumn<ActivityCategoryListItem>[] = [
  {
    header: "Activities",
    // A share rather than a fixed width, so the names keep pace with the screen.
    width: "w-2/5",
    // The count stays visible however much of the names is cut off.
    cell: (category) =>
      category.activitiesCount > 0 ? (
        <span className="flex min-w-0">
          <span className="truncate">
            <FirstActivityLinks category={category} />
          </span>
          <MoreActivities category={category} />
        </span>
      ) : (
        <span className="text-muted-foreground">{NO_ACTIVITIES}</span>
      ),
    summary: (category) =>
      category.activitiesCount > 0 ? (
        <>
          <FirstActivityLinks category={category} />
          <MoreActivities category={category} />
        </>
      ) : (
        NO_ACTIVITIES
      ),
  },
  {
    header: "On projects",
    width: "w-28",
    numeric: true,
    cell: (category) => <ManageCount count={onProjectsCount(category)} />,
    summary: (category) => (
      <span className="whitespace-nowrap">
        {onProjectsCount(category)} on projects
      </span>
    ),
  },
];

export const ActivityCategoriesContent = () => {
  const { isOnboarding, opensCreateForm } = useSetupLinkParams();
  const [createOpen, setCreateOpen] = useState(opensCreateForm);
  const listState = useManageListState();
  const panel = useEntityPanel();
  const categoryActions = useCategoryActions();
  const status =
    listState.tab === "archived"
      ? ActCategoryStatus.ARCHIVED
      : ActCategoryStatus.ACTIVE;

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);

  const {
    items: categories,
    isLoading,
    isPlaceholderData,
    isError,
    refetch,
    pagination,
  } = useActivityCategoriesInfiniteQuery({
    status,
    search: listState.searchQuery,
  });

  return (
    <>
      <ResourcePage
        title="Activity categories"
        listState={listState}
        itemCount={categories.length}
        isLoading={isLoading}
        isRefreshing={isPlaceholderData}
        isError={isError || !canManage}
        onRetry={refetch}
        searchPlaceholder="Search categories..."
        emptyTitle="No activity categories yet"
        emptyDescription="Create your first category to organize activities."
        emptyIcon={<FolderTree className="size-6" />}
        createLabel="Create category"
        onCreate={() => setCreateOpen(true)}
        canCreate={canManage}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
      >
        <ManageList
          label="Activity categories"
          items={categories}
          row={{
            getKey: (category) => category.id,
            getName: (category) => category.name,
            getEntity: (category) => ({ type: "category", id: category.id }),
            onEdit: categoryActions.edit,
            canEdit: categoryActions.canEdit,
            columns: COLUMNS,
            getActions: categoryActions.actionsFor,
          }}
        />
      </ResourcePage>

      <CategoryCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(category) =>
          panel.open({ type: "category", id: category.id })
        }
        isOnboarding={isOnboarding}
      />

      {categoryActions.dialogs}
    </>
  );
};
