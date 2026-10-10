"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore } from "lucide-react";

import {
  activityCategoryDetailsQuery,
  useActivityCategoriesMutations,
} from "@/hooks/useActivityCategories";
import { useIsOnboarding } from "@/hooks/useSetupLink";
import { ActivityCategoryDetails, ActivityCategorySummary } from "@/types";
import { ActCategoryStatus, ActivityStatus } from "@/types/enums";

import type { ManageRowAction } from "../shared/resource/ManageList";
import { ActivityCategoryModal } from "./ActivityCategoryModal";
import { CategoryArchiveDialog } from "./CategoryArchiveDialog";
import { CategoryRestoreDialog } from "./CategoryRestoreDialog";

export const isActiveCategory = (category: ActivityCategorySummary) =>
  category.status === ActCategoryStatus.ACTIVE;

/** What the viewer can do with a category, from a list row or the panel. */
export const useCategoryActions = () => {
  const isOnboarding = useIsOnboarding();
  const { unarchive } = useActivityCategoriesMutations();
  const [editingCategory, setEditingCategory] =
    useState<ActivityCategorySummary | null>(null);
  const [archivingCategory, setArchivingCategory] =
    useState<ActivityCategorySummary | null>(null);
  const [restoringCategory, setRestoringCategory] =
    useState<ActivityCategoryDetails | null>(null);
  const queryClient = useQueryClient();

  // Restoring asks about its archived activities only when it has some.
  const restore = async (category: ActivityCategorySummary) => {
    const details = await queryClient.fetchQuery(
      activityCategoryDetailsQuery(category.id),
    );
    const hasArchivedActivities = details.activities.some(
      (activity) => activity.status === ActivityStatus.ARCHIVED,
    );

    if (hasArchivedActivities) setRestoringCategory(details);
    else unarchive.mutate(category.id);
  };

  const actionsFor = (category: ActivityCategorySummary): ManageRowAction[] =>
    isActiveCategory(category)
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
            onSelect: () => void restore(category),
          },
        ];

  const dialogs = (
    <>
      <ActivityCategoryModal
        open={Boolean(editingCategory)}
        category={editingCategory ?? undefined}
        onClose={() => setEditingCategory(null)}
        isOnboarding={isOnboarding}
      />

      <CategoryArchiveDialog
        category={archivingCategory}
        onClose={() => setArchivingCategory(null)}
      />

      <CategoryRestoreDialog
        category={restoringCategory}
        onClose={() => setRestoringCategory(null)}
      />
    </>
  );

  return {
    // An archived category is read-only.
    canEdit: isActiveCategory,
    edit: setEditingCategory,
    actionsFor,
    dialogs,
  };
};
