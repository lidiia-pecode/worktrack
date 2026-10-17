"use client";

import { ConfirmModal } from "./ConfirmModal";

type DiscardChangesModalProps = {
  isOpen: boolean;
  onDiscard: () => void;
  onKeepEditing: () => void;
};

/** Asked before a form with unsaved changes is closed or left. */
export const DiscardChangesModal = ({
  isOpen,
  onDiscard,
  onKeepEditing,
}: DiscardChangesModalProps) => (
  <ConfirmModal
    isOpen={isOpen}
    title="Discard your changes?"
    message="What you changed here isn't saved yet."
    confirmText="Discard"
    cancelText="Keep editing"
    variant="danger"
    onConfirm={onDiscard}
    onClose={onKeepEditing}
  />
);
