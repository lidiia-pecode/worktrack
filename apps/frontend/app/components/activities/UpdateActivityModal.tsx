"use client";

import { useState } from "react";

import { Activity } from "@/types";

import { useActivities } from "@/hooks/useActivities";
import { useActivityCategories } from "@/hooks/useActivityCategories";

import { Modal } from "../ui/Modal/Modal";
import { ModalHeader } from "../ui/Modal/ModalHeader";
import { ConfirmModal } from "../ui/ConfirmModal";

import { ActivityForm, ActivityFormData } from "./ActivityForm";

type Props = {
  activity: Activity;
  isAdmin: boolean;
  onClose: () => void;
};

export function UpdateActivityModal({ activity, isAdmin, onClose }: Props) {
  const [edit, setEdit] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { items: categories } = useActivityCategories();

  const {
    actions: { update, delete: archive },
  } = useActivities();

  const handleSave = (data: ActivityFormData) => {
    update.mutate(
      {
        id: activity.id,
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
    await archive.mutateAsync(activity.id);

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
            document.getElementById("activity-modal-form")?.dispatchEvent(
              new Event("submit", {
                bubbles: true,
                cancelable: true,
              }),
            )
          }
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ActivityForm
            formId="activity-modal-form"
            defaultValues={{
              name: activity.name,
              categoryId: activity.category.id,
            }}
            categories={categories}
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
        title={`Are you sure you want to delete "${activity.name}"?`}
      />
    </>
  );
}
