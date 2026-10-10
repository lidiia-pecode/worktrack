"use client";

import { useProjectLinks } from "@/hooks/useProjects";

import { ImpactDialog } from "../shared/ImpactDialog";

interface Named {
  id: string;
  name: string;
}

export interface ProjectActivityRemoval {
  project: Named;
  activity: Named;
}

interface RemoveProjectActivityDialogProps {
  removal: ProjectActivityRemoval | null;
  onClose: () => void;
}

/** From the project's side or the activity's: past time stays either way. */
export const RemoveProjectActivityDialog = ({
  removal,
  onClose,
}: RemoveProjectActivityDialogProps) => {
  const { removeActivity } = useProjectLinks();

  return (
    <ImpactDialog
      isOpen={Boolean(removal)}
      title={
        removal
          ? `Remove ${removal.activity.name} from ${removal.project.name}?`
          : ""
      }
      description={
        removal
          ? `Nobody can log new time on ${removal.activity.name} in this project. Time already logged stays in reports.`
          : ""
      }
      confirmText="Remove"
      confirmVariant="destructive"
      loading={removeActivity.isPending}
      onConfirm={() =>
        removal &&
        removeActivity.mutate(
          { projectId: removal.project.id, activityId: removal.activity.id },
          { onSettled: onClose },
        )
      }
      onClose={onClose}
    />
  );
};
