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

/** An activity whose category is archived. */
type CategorisedActivity = Activity & { category: ActivityCategoryResponse };

interface ActivityRestoreDialogProps {
  /** The dialog is open while one is given. */
  activity: CategorisedActivity | null;
  onClose: () => void;
}

/**
 * An active activity is never in an archived category, so restoring one asks
 * where it goes: back with its category, to another, or, when no project
 * links it, as a draft with none.
 */
export const ActivityRestoreDialog = ({
  activity,
  onClose,
}: ActivityRestoreDialogProps) => {
  const activeCategories = useActivityCategoriesAllPagesQuery(
    { status: ActCategoryStatus.ACTIVE },
    { enabled: Boolean(activity) },
  );
  const restore = useRestoreActivityWithCategory();
  // Its links on archived projects count too, which only its details list.
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
