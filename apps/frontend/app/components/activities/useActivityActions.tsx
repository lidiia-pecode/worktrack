"use client";

import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";

import { useActivitiesMutations } from "@/hooks/useActivities";
import { Activity } from "@/types";
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
  const [restoringActivity, setRestoringActivity] = useState<Activity | null>(
    null,
  );

  // An active activity needs an active category, so restoring one whose
  // category is archived asks what to do with it first.
  const restore = (activity: Activity) => {
    if (activity.category.status === ActCategoryStatus.ARCHIVED) {
      setRestoringActivity(activity);
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
