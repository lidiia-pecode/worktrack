"use client";

import { useState } from "react";

import { useActivitiesMutations } from "@/hooks/useActivities";
import { Activity } from "@/types";
import { ActCategoryStatus, ActivityStatus } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { archiveOrRestore } from "../shared/resource/ManageList";
import { ActivityArchiveDialog } from "./ActivityArchiveDialog";
import {
  ActivityRestoreDialog,
  ActivityWithCategory,
} from "./ActivityRestoreDialog";

export const isActiveActivity = (activity: Activity) =>
  activity.status === ActivityStatus.ACTIVE;

/** What the viewer can do with an activity, from a list row or the panel. */
export const useActivityActions = () => {
  const panel = useEntityPanel();
  const { unarchive } = useActivitiesMutations();
  const [archivingActivity, setArchivingActivity] = useState<Activity | null>(
    null,
  );
  const [restoringActivity, setRestoringActivity] =
    useState<ActivityWithCategory | null>(null);

  // A draft, or an activity in an active category, restores at once; otherwise the dialog asks where it goes.
  const restore = (activity: Activity) => {
    const { category } = activity;

    if (category?.status === ActCategoryStatus.ARCHIVED) {
      setRestoringActivity({ ...activity, category });
      return;
    }

    unarchive.mutate(activity.id);
  };

  const actionsFor = (activity: Activity) =>
    archiveOrRestore(isActiveActivity(activity), {
      archive: () => setArchivingActivity(activity),
      restore: () => restore(activity),
    });

  const dialogs = (
    <>
      <ActivityArchiveDialog
        activity={archivingActivity}
        onClose={() => setArchivingActivity(null)}
      />

      <ActivityRestoreDialog
        activity={restoringActivity}
        onClose={() => setRestoringActivity(null)}
      />
    </>
  );

  return {
    canEdit: isActiveActivity,
    edit: (activity: Activity) =>
      panel.edit({ type: "activity", id: activity.id }),
    actionsFor,
    dialogs,
  };
};
