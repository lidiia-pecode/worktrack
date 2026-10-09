"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Tags } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import {
  useActivityCategoriesInfiniteQuery,
  useActivityCategoriesMutations,
} from "@/hooks/useActivityCategories";
import { hasManagerAccess } from "@/lib/utils/user";

import { ActivityCategoryListItem } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import {
  countLabel,
  ManageColumn,
  ManageList,
  ManageRowAction,
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { ActivityCategoryModal } from "./ActivityCategoryModal";
import { CategoryArchiveDialog } from "./CategoryArchiveDialog";

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
  const [openedCategoryId, setOpenedCategoryId] = useState<string | null>(null);
  const [archivingCategory, setArchivingCategory] =
    useState<ActivityCategoryListItem | null>(null);
  const listState = useManageListState();
  const status =
    listState.tab === "archived"
      ? ActCategoryStatus.ARCHIVED
      : ActCategoryStatus.ACTIVE;

  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);
  const { unarchive } = useActivityCategoriesMutations();

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

  const openedCategory = categories.find(
    (category) => category.id === openedCategoryId,
  );

  const actionsFor = (category: ActivityCategoryListItem): ManageRowAction[] =>
    category.status === ActCategoryStatus.ACTIVE
      ? [
          {
            label: "Archive",
            icon: Archive,
            destructive: true,
            onSelect: () => setArchivingCategory(category),
          },
        ]
      : [
          {
            label: "Restore",
            icon: ArchiveRestore,
            onSelect: () => unarchive.mutate(category.id),
          },
        ];

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
            onOpen: (category) => setOpenedCategoryId(category.id),
            columns: COLUMNS,
            getActions: actionsFor,
          }}
        />
      </ResourcePage>

      <ActivityCategoryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        isOnboarding={isOnboarding}
      />

      <ActivityCategoryModal
        open={Boolean(openedCategory)}
        category={openedCategory}
        onClose={() => setOpenedCategoryId(null)}
        isOnboarding={isOnboarding}
      />

      {archivingCategory && (
        <CategoryArchiveDialog
          isOpen
          category={archivingCategory}
          onClose={() => setArchivingCategory(null)}
          onArchived={() => setArchivingCategory(null)}
        />
      )}
    </>
  );
};
