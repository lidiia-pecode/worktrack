import { useState } from "react";

import { useActivityCategories } from "@/hooks/useActivityCategories";
import { ActivityCategory } from "@/types";
import { EntityCard } from "../shared/EntityCard";
import { ConfirmModal } from "../shared/ConfirmModal";
import { UpdateActCategoryModal } from "./UpdateActCategoryModal";
import { StatusBadge } from "../shared/StatusBadge";

type Props = { category: ActivityCategory; isAdmin: boolean };

export const ActCategoryCard = ({ category, isAdmin }: Props) => {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    actions: { archive },
  } = useActivityCategories();

  const handleConfirmArchive = () => {
    archive.mutate(category.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <EntityCard onClick={() => setOpen(true)}>
        <EntityCard.Header>
          <div className="min-w-0">
            <EntityCard.Title>{category.name}</EntityCard.Title>
          </div>

          <StatusBadge status={category.status} />
        </EntityCard.Header>
      </EntityCard>

      {open && (
        <UpdateActCategoryModal
          category={category}
          isAdmin={isAdmin}
          onClose={() => setOpen(false)}
        />
      )}

      {isAdmin && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmArchive}
          title={`Are you sure you want delete the "${category.name}"?`}
        />
      )}
    </>
  );
};
