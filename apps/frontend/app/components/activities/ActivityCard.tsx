import { useState } from "react";
import { Tag } from "lucide-react";

import { useActivities } from "@/hooks/useActivities";
import { Activity } from "@/types";
import { EntityCard } from "../shared/EntityCard";
import { ConfirmModal } from "../shared/ConfirmModal";
import { UpdateActivityModal } from "./UpdateActivityModal";
import { StatusBadge } from "../shared/StatusBadge";

type Props = { activity: Activity; isAdmin: boolean };

export const ActivityCard = ({ activity, isAdmin }: Props) => {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    actions: { archive },
  } = useActivities();

  console.log(activity);

  const handleConfirmArchive = async () => {
    await archive.mutateAsync(activity.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <EntityCard onClick={() => setOpen(true)}>
        <EntityCard.Header>
          <div className="min-w-0">
            <EntityCard.Title>{activity.name}</EntityCard.Title>
          </div>

          <StatusBadge status={activity.status} />
        </EntityCard.Header>

        <EntityCard.Footer>
          <EntityCard.Meta icon={Tag}>{activity.category.name}</EntityCard.Meta>
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
          title={`Are you sure you want delete the "${activity.name}"?`}
        />
      )}
    </>
  );
};
