"use client";

import { useState } from "react";
import { Tags } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import { useActivityCategoriesInfiniteQuery } from "@/hooks/useActivityCategories";
import { hasManagerAccess } from "@/lib/utils/user";

import { ActivityCategoryListItem } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import {
  countLabel,
  ManageColumn,
  ManageList,
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { CategoryCreateDialog } from "./CategoryCreateDialog";
import { useCategoryActions } from "./useCategoryActions";

const COLUMNS: ManageColumn<ActivityCategoryListItem>[] = [
  {
    header: "Activities",
    width: "w-28",
    numeric: true,
    cell: (category) => category.activitiesCount,
    summary: (category) =>
      countLabel(category.activitiesCount, "activity", "activities"),
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
  } = useActivityCategoriesInfiniteQuery(
    { status, search: listState.searchQuery },
    { keepPreviousData: true },
  );

  return (
    <>
      <ResourcePage
        title="Activity categories"
        description="Organize activities into categories for easier time tracking."
        listState={listState}
        itemCount={categories.length}
        isLoading={isLoading}
        isRefreshing={isPlaceholderData}
        isError={isError || !canManage}
        onRetry={refetch}
        searchPlaceholder="Search categories..."
        emptyTitle="No activity categories yet"
        emptyDescription="Create your first category to organize activities."
        emptyIcon={<Tags className="size-6" />}
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
