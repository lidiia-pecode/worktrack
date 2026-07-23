"use client";

import { useState } from "react";

import { Activity } from "@/types";

import { useActivities } from "@/hooks/useActivities";
import { useActivityCategories } from "@/hooks/useActivityCategories";

import { Modal } from "../shared/Modal/Modal";
import { ModalHeader } from "../shared/Modal/ModalHeader";
import { ConfirmModal } from "../shared/ConfirmModal";

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
    actions: { update, archive, unarchive },
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

  const handleRestore = async () => {
    await unarchive.mutateAsync(activity.id);

    onClose();
  };

  return (
    <>
      <Modal isOpen onClose={onClose} contentClassName="pb-6">
        <ModalHeader
          title="Activity details"
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
              status: activity.status,
            }}
            categories={categories}
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
        title={`Archive "${activity.name}"?`}
        message="Archived activities will be hidden from the active list. You can restore them later."
        confirmText="Archive"
        variant="archive"
      />
    </>
  );
}
