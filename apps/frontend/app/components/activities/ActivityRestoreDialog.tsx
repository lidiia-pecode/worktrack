"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Activity } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { useRestoreActivityWithCategory } from "@/hooks/useActivities";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";

import { FormSelect } from "../shared/FormSelect";

const RESTORE_CATEGORY_OPTION = "restore-category";

interface ActivityRestoreDialogProps {
  isOpen: boolean;
  activity: Activity;
  onClose: () => void;
  onRestored: () => void;
}

export const ActivityRestoreDialog = ({
  isOpen,
  activity,
  onClose,
  onRestored,
}: ActivityRestoreDialogProps) => {
  const activeCategories = useActivityCategoriesAllPagesQuery(
    { status: ActCategoryStatus.ACTIVE },
    { enabled: isOpen },
  );
  const restore = useRestoreActivityWithCategory();

  const [selectedOption, setSelectedOption] = useState(RESTORE_CATEGORY_OPTION);

  const categoryName = activity.category.name;
  const restoresCategory = selectedOption === RESTORE_CATEGORY_OPTION;

  const options = [
    { value: RESTORE_CATEGORY_OPTION, label: `Restore ${categoryName} too` },
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
    restore.mutate(
      restoresCategory
        ? { id: activity.id, restoreCategoryId: activity.category.id }
        : { id: activity.id, moveToCategoryId: selectedOption },
      { onSuccess: onRestored },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <div className="grid gap-4 p-6">
          <DialogHeader>
            <DialogTitle>Restore {activity.name}?</DialogTitle>
            <DialogDescription>
              Its category, {categoryName}, is archived. Restore it too, or move
              the activity to an active category.
            </DialogDescription>
          </DialogHeader>

          <FormSelect
            label="Category"
            value={selectedOption}
            options={options}
            onValueChange={setSelectedOption}
            disabled={restore.isPending || activeCategories.isLoading}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={close}
            disabled={restore.isPending}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={confirm}
            isLoading={restore.isPending}
          >
            Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
