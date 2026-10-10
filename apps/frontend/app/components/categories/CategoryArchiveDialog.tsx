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

import { ActivityCategorySummary } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import {
  useActivityCategoriesAllPagesQuery,
  useActivityCategoryArchiveImpact,
  useArchiveActivityCategory,
} from "@/hooks/useActivityCategories";

import { FormSelect } from "../shared/FormSelect";
import { activitiesArchiveImpactMessage } from "../activities/archive-impact";

import {
  ARCHIVE_ACTIVITIES_OPTION,
  archiveActivitiesLabel,
  archivePayload,
  categoryArchiveDescription,
  noMoveTargetMessage,
} from "./category-archive";

interface CategoryArchiveDialogProps {
  isOpen: boolean;
  category: ActivityCategorySummary;
  onClose: () => void;
  onArchived: () => void;
}

export const CategoryArchiveDialog = ({
  isOpen,
  category,
  onClose,
  onArchived,
}: CategoryArchiveDialogProps) => {
  const impact = useActivityCategoryArchiveImpact(category.id, isOpen);
  const activeCategories = useActivityCategoriesAllPagesQuery(
    { status: ActCategoryStatus.ACTIVE },
    { enabled: isOpen },
  );
  const archive = useArchiveActivityCategory();

  const [chosenOption, setChosenOption] = useState<string>();

  const activities = impact.data?.activities ?? [];
  const hasActiveActivities = activities.length > 0;

  const moveTargets = activeCategories.items.filter(
    (target) => target.id !== category.id,
  );
  const selectedOption =
    chosenOption ?? moveTargets[0]?.id ?? ARCHIVE_ACTIVITIES_OPTION;
  const archivesActivities =
    hasActiveActivities && selectedOption === ARCHIVE_ACTIVITIES_OPTION;

  const options = [
    ...moveTargets.map((target) => ({
      value: target.id,
      label: `Move to ${target.name}`,
    })),
    {
      value: ARCHIVE_ACTIVITIES_OPTION,
      label: archiveActivitiesLabel(activities.length),
    },
  ];

  const isReady = Boolean(impact.data) && !activeCategories.isLoading;

  const close = () => {
    setChosenOption(undefined);
    onClose();
  };

  const confirm = () => {
    archive.mutate(
      {
        id: category.id,
        payload: archivePayload(
          activities.length,
          archivesActivities,
          selectedOption,
        ),
      },
      {
        onSuccess: () => {
          setChosenOption(undefined);
          onArchived();
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="grid gap-4 p-6">
          <DialogHeader className="pr-6">
            <DialogTitle>Archive {category.name}?</DialogTitle>
            <DialogDescription>
              {impact.isError
                ? "Could not check its activities. Close this and try again."
                : impact.data
                  ? categoryArchiveDescription(
                      category.name,
                      activities.map((activity) => activity.name),
                    )
                  : "Checking its activities..."}
            </DialogDescription>
          </DialogHeader>

          {isReady && hasActiveActivities && (
            <div className="space-y-3 text-sm text-muted-foreground">
              {moveTargets.length > 0 ? (
                <FormSelect
                  label="Its activities"
                  value={selectedOption}
                  options={options}
                  onValueChange={setChosenOption}
                  disabled={archive.isPending}
                />
              ) : (
                <p>{noMoveTargetMessage(activities.length)}</p>
              )}

              {archivesActivities && (
                <p>{activitiesArchiveImpactMessage(activities)}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={close}
            disabled={archive.isPending}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant={archivesActivities ? "destructive" : "warning"}
            size="sm"
            onClick={confirm}
            isLoading={archive.isPending}
            disabled={!isReady}
          >
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
