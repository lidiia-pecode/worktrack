"use client";

import {
  useActivitiesMutations,
  useActivityArchiveImpact,
} from "@/hooks/useActivities";
import { Activity } from "@/types";

import { ImpactDialog } from "../shared/ImpactDialog";

interface ActivityArchiveDialogProps {
  /** The activity to archive; the dialog is open while one is given. */
  activity: Activity | null;
  onClose: () => void;
  onArchived?: () => void;
}

export const ActivityArchiveDialog = ({
  activity,
  onClose,
  onArchived,
}: ActivityArchiveDialogProps) => {
  const { archive } = useActivitiesMutations();
  const impact = useActivityArchiveImpact(
    activity?.id ?? "",
    Boolean(activity),
  );
  const projects = impact.data?.projects ?? [];

  const confirmArchive = () => {
    if (!activity || !impact.data) return;

    archive.mutate(activity.id, {
      onSuccess: () => {
        onClose();
        onArchived?.();
      },
    });
  };

  const description = impact.isError
    ? "Could not check which projects use it. Close this and try again."
    : !impact.data
      ? "Checking which projects use it..."
      : projects.length === 0
        ? "No active project offers it now. You can restore it later."
        : "Nobody can log new time on it in these projects. Time already logged stays in reports, and restoring it puts it back on them.";

  return (
    <ImpactDialog
      isOpen={Boolean(activity)}
      title={activity ? `Archive ${activity.name}?` : ""}
      description={description}
      affected={[
        {
          label: "Projects that lose it",
          entities: projects.map((project) => ({
            entity: { type: "project", id: project.id },
            name: project.name,
          })),
        },
      ]}
      confirmText="Archive"
      confirmVariant="destructive"
      onConfirm={confirmArchive}
      onClose={onClose}
      loading={archive.isPending}
      confirmDisabled={!impact.data}
    />
  );
};
