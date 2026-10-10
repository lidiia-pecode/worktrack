"use client";

import { useState } from "react";

import { ActivityCategorySummary } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import {
  useActivityCategoriesAllPagesQuery,
  useActivityCategoryArchiveImpact,
  useArchiveActivityCategory,
} from "@/hooks/useActivityCategories";

import { FormSelect } from "../shared/FormSelect";
import { ImpactDialog } from "../shared/ImpactDialog";
import { distinctProjects } from "../activities/archive-impact";

import {
  ARCHIVE_ACTIVITIES_OPTION,
  archiveActivitiesLabel,
  archivePayload,
  DRAFTS_OPTION,
  draftsLabel,
  noMoveTargetMessage,
} from "./category-archive";

interface CategoryArchiveDialogProps {
  /** The category to archive; the dialog is open while one is given. */
  category: ActivityCategorySummary | null;
  onClose: () => void;
}

export const CategoryArchiveDialog = ({
  category,
  onClose,
}: CategoryArchiveDialogProps) => {
  const isOpen = Boolean(category);
  const impact = useActivityCategoryArchiveImpact(category?.id ?? "", isOpen);
  const activeCategories = useActivityCategoriesAllPagesQuery(
    { status: ActCategoryStatus.ACTIVE },
    { enabled: isOpen },
  );
  const archive = useArchiveActivityCategory();

  const [chosenOption, setChosenOption] = useState<string>();

  const activities = impact.data?.activities ?? [];
  const hasActiveActivities = activities.length > 0;

  // Left without a category, an activity becomes a draft, which a project
  // may not offer; so that is offered only while no project links any.
  const canLeaveDrafts =
    hasActiveActivities && activities.every((activity) => !activity.isInUse);
  const moveTargets = activeCategories.items.filter(
    (target) => target.id !== category?.id,
  );
  const selectedOption =
    chosenOption ??
    (canLeaveDrafts ? DRAFTS_OPTION : undefined) ??
    moveTargets[0]?.id ??
    ARCHIVE_ACTIVITIES_OPTION;
  const archivesActivities =
    hasActiveActivities && selectedOption === ARCHIVE_ACTIVITIES_OPTION;

  const options = [
    ...(canLeaveDrafts
      ? [{ value: DRAFTS_OPTION, label: draftsLabel(activities.length) }]
      : []),
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
    if (!category) return;

    archive.mutate(
      {
        id: category.id,
        payload: archivePayload(activities.length, selectedOption),
      },
      {
        onSuccess: close,
      },
    );
  };

  const description = impact.isError
    ? "Could not check its activities. Close this and try again."
    : !impact.data
      ? "Checking its activities..."
      : canLeaveDrafts
        ? "No project uses its active activities, so they can stay as drafts without a category, move to another one, or be archived with it."
        : hasActiveActivities
          ? "Its active activities are on projects, so they need a category: they move to another one or are archived with it."
          : "Nobody will be able to put new activities in it. You can restore it later.";

  return (
    <ImpactDialog
      isOpen={isOpen}
      title={category ? `Archive ${category.name}?` : ""}
      description={description}
      affected={[
        {
          label: "Its active activities",
          entities: activities.map((activity) => ({
            entity: { type: "activity", id: activity.id },
            name: activity.name,
          })),
        },
        {
          label: "Projects that lose them",
          entities: archivesActivities
            ? distinctProjects(
                activities.flatMap((activity) => activity.projects),
              ).map((project) => ({
                entity: { type: "project", id: project.id },
                name: project.name,
              }))
            : [],
        },
      ]}
      choice={
        isReady &&
        hasActiveActivities &&
        (options.length > 1 ? (
          <FormSelect
            label="Its activities"
            value={selectedOption}
            options={options}
            onValueChange={setChosenOption}
            disabled={archive.isPending}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {noMoveTargetMessage(activities.length)}
          </p>
        ))
      }
      confirmText="Archive"
      confirmVariant={archivesActivities ? "destructive" : "warning"}
      onConfirm={confirm}
      onClose={close}
      loading={archive.isPending}
      confirmDisabled={!isReady}
    />
  );
};
