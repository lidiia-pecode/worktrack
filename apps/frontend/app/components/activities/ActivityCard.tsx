import { useState } from "react";

import { useActivities } from "@/hooks/useActivities";
import { Activity } from "@/types";
import { EntityCard } from "../shared/EntityCard";
import { ConfirmModal } from "../shared/ConfirmModal";
import { UpdateActivityModal } from "./UpdateActivityModal";
import { Status } from "@/types/enums";
import { StatusBadge } from "../shared/StatusBadge";
import { CategoryBadge } from "../shared/CategoryBadge";

type Props = { activity: Activity; isAdmin: boolean };

export const ActivityCard = ({ activity, isAdmin }: Props) => {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    actions: { archive },
  } = useActivities();

  const handleConfirmArchive = async () => {
    await archive.mutateAsync(activity.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <EntityCard
        onClick={() => setOpen(true)}
        isArchived={activity.status === Status.ARCHIVED}
      >
        <EntityCard.Header>
          <div className="min-w-0">
            <EntityCard.Title>{activity.name}</EntityCard.Title>
          </div>

          <StatusBadge status={activity.status} />
        </EntityCard.Header>

        <EntityCard.Footer>
          <CategoryBadge name={activity.category.name} />
        </EntityCard.Footer>
      </EntityCard>

      {open && (
        <UpdateActivityModal
          activity={activity}
          isAdmin={isAdmin}
          onClose={() => setOpen(false)}
        />
      )}

      {isAdmin && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmArchive}
          loading={archive.isPending}
          title={`Archive "${activity.name}"?`}
          message="Archived activities will be hidden from the active list. You can restore them later."
          confirmText="Archive"
          variant="archive"
        />
      )}
    </>
  );
};
