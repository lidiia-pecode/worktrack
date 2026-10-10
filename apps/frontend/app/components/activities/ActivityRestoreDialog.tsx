"use client";

import { useState } from "react";

import { Activity } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { useRestoreActivityWithCategory } from "@/hooks/useActivities";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";

import { FormSelect } from "../shared/FormSelect";
import { ImpactDialog } from "../shared/ImpactDialog";

const RESTORE_CATEGORY_OPTION = "restore-category";

interface ActivityRestoreDialogProps {
  /** An activity whose category is archived; the dialog is open while one is given. */
  activity: Activity | null;
  onClose: () => void;
  onRestored?: () => void;
}

/** An active activity needs an active category, so restoring one asks where it goes. */
export const ActivityRestoreDialog = ({
  activity,
  onClose,
  onRestored,
}: ActivityRestoreDialogProps) => {
  const activeCategories = useActivityCategoriesAllPagesQuery(
    { status: ActCategoryStatus.ACTIVE },
    { enabled: Boolean(activity) },
  );
  const restore = useRestoreActivityWithCategory();

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
        : { id: activity.id, moveToCategoryId: selectedOption },
      {
        onSuccess: () => {
          close();
          onRestored?.();
        },
      },
    );
  };

  return (
    <ImpactDialog
      isOpen={Boolean(activity)}
      title={activity ? `Restore ${activity.name}?` : ""}
      description="Its category is archived. Restore the category too, or move the activity to an active one."
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
      confirmText="Restore"
      confirmVariant="success"
      onConfirm={confirm}
      onClose={close}
      loading={restore.isPending}
    />
  );
};
