"use client";

import {
  useActivitiesMutations,
  useActivityArchiveImpact,
} from "@/hooks/useActivities";
import { Activity } from "@/types";

import { ConfirmModal } from "../shared/ConfirmModal";
import { archiveImpactMessage } from "./archive-impact";

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
  const archiveImpact = useActivityArchiveImpact(
    activity?.id ?? "",
    Boolean(activity),
  );

  const confirmArchive = () => {
    if (!activity || !archiveImpact.data) return;

    archive.mutate(activity.id, {
      onSuccess: () => {
        onClose();
        onArchived?.();
      },
    });
  };

  return (
    <ConfirmModal
      isOpen={Boolean(activity)}
      title={activity ? `Archive ${activity.name}?` : ""}
      message={
        archiveImpact.isError
          ? "Could not check which projects use it. Close this and try again."
          : archiveImpactMessage(archiveImpact.data)
      }
      confirmText="Archive"
      variant="danger"
      onConfirm={confirmArchive}
      onClose={onClose}
      loading={archive.isPending}
      confirmDisabled={!archiveImpact.data}
    />
  );
};
