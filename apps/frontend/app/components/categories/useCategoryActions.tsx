"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  activityCategoryDetailsQuery,
  useActivityCategoriesMutations,
} from "@/hooks/useActivityCategories";
import { ActivityCategoryDetails, ActivityCategorySummary } from "@/types";
import { getErrorMessage } from "@/lib/api";
import { ActCategoryStatus, ActivityStatus } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { archiveOrRestore } from "../shared/resource/ManageList";
import { CategoryArchiveDialog } from "./CategoryArchiveDialog";
import { CategoryRestoreDialog } from "./CategoryRestoreDialog";

export const isActiveCategory = (category: ActivityCategorySummary) =>
  category.status === ActCategoryStatus.ACTIVE;

/** What the viewer can do with a category, from a list row or the panel. */
export const useCategoryActions = () => {
  const panel = useEntityPanel();
  const { unarchive } = useActivityCategoriesMutations();
  const [archivingCategory, setArchivingCategory] =
    useState<ActivityCategorySummary | null>(null);
  const [restoringCategory, setRestoringCategory] =
    useState<ActivityCategoryDetails | null>(null);
  const queryClient = useQueryClient();

  const [isCheckingRestore, setIsCheckingRestore] = useState(false);

  // Restoring asks about its archived activities only when it has some.
  const restore = async (category: ActivityCategorySummary) => {
    if (isCheckingRestore || unarchive.isPending) return;

    setIsCheckingRestore(true);
    try {
      const details = await queryClient.fetchQuery(
        activityCategoryDetailsQuery(category.id),
      );
      const hasArchivedActivities = details.activities.some(
        (activity) => activity.status === ActivityStatus.ARCHIVED,
      );

      if (hasArchivedActivities) setRestoringCategory(details);
      else unarchive.mutate(category.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCheckingRestore(false);
    }
  };

  const actionsFor = (category: ActivityCategorySummary) =>
    archiveOrRestore(isActiveCategory(category), {
      archive: () => setArchivingCategory(category),
      restore: () => void restore(category),
    });

  const dialogs = (
    <>
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
    canEdit: isActiveCategory,
    edit: (category: ActivityCategorySummary) =>
      panel.edit({ type: "category", id: category.id }),
    actionsFor,
    dialogs,
  };
};
