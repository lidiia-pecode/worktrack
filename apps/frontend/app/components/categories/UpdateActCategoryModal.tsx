"use client";

import { useState } from "react";
import { ActivityCategory } from "@/types";
import { useActivityCategories } from "@/hooks/useActivityCategories";

import { Modal } from "../ui/Modal/Modal";
import { ModalHeader } from "../ui/Modal/ModalHeader";
import { ConfirmModal } from "../ui/ConfirmModal";
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
    actions: { update, delete: archive },
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

  return (
    <>
      <Modal isOpen onClose={onClose} contentClassName="pb-6">
        <ModalHeader
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
            }}
            isEditMode={edit}
            onSubmit={handleSave}
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchive}
        loading={archive.isPending}
        title={`Are you sure you want to delete "${category.name}"?`}
      />
    </>
  );
}
