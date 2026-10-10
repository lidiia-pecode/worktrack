"use client";

import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";

import { useActivitiesMutations } from "@/hooks/useActivities";
import { Activity, ActivityCategoryResponse } from "@/types";
import { ActCategoryStatus, ActivityStatus } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import type { ManageRowAction } from "../shared/resource/ManageList";
import { ActivityArchiveDialog } from "./ActivityArchiveDialog";
import { ActivityRestoreDialog } from "./ActivityRestoreDialog";

export const isActiveActivity = (activity: Activity) =>
  activity.status === ActivityStatus.ACTIVE;

/** What the viewer can do with an activity, from a list row or the panel. */
export const useActivityActions = () => {
  const panel = useEntityPanel();
  const { unarchive } = useActivitiesMutations();
  const [archivingActivity, setArchivingActivity] = useState<Activity | null>(
    null,
  );
  const [restoringActivity, setRestoringActivity] = useState<
    (Activity & { category: ActivityCategoryResponse }) | null
  >(null);

  // An active activity is never in an archived category, so restoring one
  // whose category is archived asks what to do with it first. A draft just
  // comes back as a draft.
  const restore = (activity: Activity) => {
    const { category } = activity;

    if (category?.status === ActCategoryStatus.ARCHIVED) {
      setRestoringActivity({ ...activity, category });
      return;
    }

    unarchive.mutate(activity.id);
  };

  const actionsFor = (activity: Activity): ManageRowAction[] =>
    isActiveActivity(activity)
      ? [
          {
            label: "Archive",
            icon: Archive,
            destructive: true,
            onSelect: () => setArchivingActivity(activity),
          },
        ]
      : [
          {
            label: "Restore",
            icon: ArchiveRestore,
            onSelect: () => restore(activity),
          },
        ];

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
