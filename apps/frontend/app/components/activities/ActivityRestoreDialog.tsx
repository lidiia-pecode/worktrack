"use client";

import { useState } from "react";

import { Activity, ActivityCategoryResponse } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import {
  useActivityDetails,
  useRestoreActivityWithCategory,
} from "@/hooks/useActivities";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";

import { FormSelect } from "../shared/FormSelect";
import { ImpactDialog } from "../shared/ImpactDialog";

const RESTORE_CATEGORY_OPTION = "restore-category";
const DRAFT_OPTION = "draft";

export type ActivityWithCategory = Activity & {
  category: ActivityCategoryResponse;
};

interface ActivityRestoreDialogProps {
  /** The dialog is open while this is set. */
  activity: ActivityWithCategory | null;
  onClose: () => void;
}

/** Its category is archived, so restoring asks where it goes: back with the category, to another one, or, if no project links it, as a draft. */
export const ActivityRestoreDialog = ({
  activity,
  onClose,
}: ActivityRestoreDialogProps) => {
  const activeCategories = useActivityCategoriesAllPagesQuery(
    { status: ActCategoryStatus.ACTIVE },
    { enabled: Boolean(activity) },
  );
  const restore = useRestoreActivityWithCategory();
  // Only its details include links on archived projects, which count too.
  const details = useActivityDetails(activity?.id ?? "");
  const canBeDraft = details.data
    ? (details.data.projects ?? []).length === 0
    : false;

  const [selectedOption, setSelectedOption] = useState(RESTORE_CATEGORY_OPTION);
  const restoresCategory = selectedOption === RESTORE_CATEGORY_OPTION;

  const options = [
    {
      value: RESTORE_CATEGORY_OPTION,
      label: `Restore ${activity?.category.name ?? "its category"} too`,
    },
    ...activeCategories.items.map((category) => ({
      value: category.id,
      label: `Move to ${category.name}`,
    })),
    ...(canBeDraft
      ? [
          {
            value: DRAFT_OPTION,
            label: "Restore it as a draft, with no category",
          },
        ]
      : []),
  ];

  const close = () => {
    setSelectedOption(RESTORE_CATEGORY_OPTION);
    onClose();
  };

  const confirm = () => {
    if (!activity) return;

    restore.mutate(
      restoresCategory
        ? { id: activity.id, restoreCategoryId: activity.category.id }
        : selectedOption === DRAFT_OPTION
          ? { id: activity.id, withoutCategory: true }
          : { id: activity.id, moveToCategoryId: selectedOption },
      {
        onSuccess: close,
      },
    );
  };

  return (
    <ImpactDialog
      isOpen={Boolean(activity)}
      title={activity ? `Restore ${activity.name}?` : ""}
      description={
        canBeDraft
          ? "Its category is archived. Restore the category too, move it to an active one, or bring it back as a draft until it has a category."
          : "Its category is archived. Restore the category too, or move it to an active one: it is on a project, so it needs a category."
      }
      affected={
        activity
          ? [
              {
                label: "Archived category",
                entities: [
                  {
                    entity: { type: "category", id: activity.category.id },
                    name: activity.category.name,
                  },
                ],
              },
            ]
          : []
      }
      choice={
        <FormSelect
          label="Category"
          value={selectedOption}
          options={options}
          onValueChange={setSelectedOption}
          disabled={restore.isPending || activeCategories.isLoading}
        />
      }
      confirmDisabled={!details.data}
      confirmText="Restore"
      confirmVariant="success"
      onConfirm={confirm}
      onClose={close}
      loading={restore.isPending}
    />
  );
};
