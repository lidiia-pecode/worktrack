"use client";

import { useState } from "react";

import { useRestoreActivityCategory } from "@/hooks/useActivityCategories";
import { ActivityCategoryDetails } from "@/types";
import { ActivityStatus, ArchivedActivitiesAction } from "@/types/enums";

import { linkedEntities } from "../entity-panel/EntityLink";
import { FormSelect } from "../shared/FormSelect";
import { ImpactDialog } from "../shared/ImpactDialog";

const WITH_ACTIVITIES = "with-activities";
const CATEGORY_ALONE = "category-alone";

interface CategoryRestoreDialogProps {
  /** A category with archived activities; the dialog is open while this is set. */
  category: ActivityCategoryDetails | null;
  onClose: () => void;
}

/** Nothing records which activities were archived with the category, so the choice covers all of them. */
export const CategoryRestoreDialog = ({
  category,
  onClose,
}: CategoryRestoreDialogProps) => {
  const restore = useRestoreActivityCategory();
  const [selectedOption, setSelectedOption] = useState(WITH_ACTIVITIES);

  const archivedActivities = (category?.activities ?? []).filter(
    (activity) => activity.status === ActivityStatus.ARCHIVED,
  );
  const isOne = archivedActivities.length === 1;

  const close = () => {
    setSelectedOption(WITH_ACTIVITIES);
    onClose();
  };

  const confirm = () => {
    if (!category) return;

    restore.mutate(
      {
        id: category.id,
        payload:
          selectedOption === WITH_ACTIVITIES
            ? { activities: ArchivedActivitiesAction.RESTORE }
            : {},
      },
      { onSuccess: close },
    );
  };

  return (
    <ImpactDialog
      isOpen={Boolean(category)}
      title={category ? `Restore ${category.name}?` : ""}
      description={`It has ${isOne ? "an archived activity" : `${archivedActivities.length} archived activities`}. Restore ${isOne ? "it" : "them"} with the category, or the category alone.`}
      affected={[
        {
          label: "Archived activities",
          entities: linkedEntities("activity", archivedActivities),
        },
      ]}
      choice={
        <FormSelect
          label="Its archived activities"
          value={selectedOption}
          options={[
            {
              value: WITH_ACTIVITIES,
              label: `Restore ${isOne ? "it" : "them"} too`,
            },
            { value: CATEGORY_ALONE, label: "Restore the category alone" },
          ]}
          onValueChange={setSelectedOption}
          disabled={restore.isPending}
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
