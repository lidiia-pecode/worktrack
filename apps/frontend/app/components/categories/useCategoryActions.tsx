"use client";

import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";

import { useActivityCategoriesMutations } from "@/hooks/useActivityCategories";
import { useIsOnboarding } from "@/hooks/useSetupLink";
import { ActivityCategorySummary } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import type { ManageRowAction } from "../shared/resource/ManageList";
import { ActivityCategoryModal } from "./ActivityCategoryModal";
import { CategoryArchiveDialog } from "./CategoryArchiveDialog";

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
            onSelect: () => unarchive.mutate(category.id),
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

  return {
    // An archived category is read-only.
    canEdit: isActiveCategory,
    edit: setEditingCategory,
    actionsFor,
    dialogs,
  };
};
