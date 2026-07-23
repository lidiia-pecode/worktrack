"use client";

import { useState } from "react";
import { ActivityCategory } from "@/types";
import { useActivityCategories } from "@/hooks/useActivityCategories";

import { Modal } from "../shared/Modal/Modal";
import { ModalHeader } from "../shared/Modal/ModalHeader";
import { ConfirmModal } from "../shared/ConfirmModal";
import { ActCategoryForm, ActCategoryFormData } from "./ActCategoryForm";

type Props = {
  category: ActivityCategory;
  isAdmin: boolean;
  onClose: () => void;
};

export function UpdateActCategoryModal({ category, isAdmin, onClose }: Props) {
  const [edit, setEdit] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const {
    actions: { update, archive, unarchive },
  } = useActivityCategories();

  const handleSave = (data: ActCategoryFormData) => {
    update.mutate(
      {
        id: category.id,
        data,
      },
      {
        onSuccess: () => {
          setEdit(false);
        },
      },
    );
  };

  const handleArchive = async () => {
    await archive.mutateAsync(category.id);

    setArchiveOpen(false);
    onClose();
  };

  const handleRestore = async () => {
    await unarchive.mutateAsync(category.id);

    onClose();
  };

  return (
    <>
      <Modal isOpen onClose={onClose} contentClassName="pb-6">
        <ModalHeader
          title="Category details"
          edit={edit}
          isAdmin={isAdmin}
          onToggleEdit={() => setEdit((prev) => !prev)}
          onSave={() =>
            document.getElementById("act-category-modal-form")?.dispatchEvent(
              new Event("submit", {
                bubbles: true,
                cancelable: true,
              }),
            )
          }
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ActCategoryForm
            formId="act-category-modal-form"
            defaultValues={{
              name: category.name,
              status: category.status,
            }}
            isEditMode={edit}
            onSubmit={handleSave}
            onArchive={handleArchive}
            onRestore={handleRestore}
            archiveLoading={archive.isPending || unarchive.isPending}
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        loading={archive.isPending}
        title={`Archive "${category.name}"?`}
        message="Archived categories will be hidden from the active list. You can restore them later."
        confirmText="Archive"
        variant="archive"
      />
    </>
  );
}
