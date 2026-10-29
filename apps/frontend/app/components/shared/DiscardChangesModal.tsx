"use client";

import { ImpactDialog } from "./ImpactDialog";

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
  <ImpactDialog
    isOpen={isOpen}
    title="Discard your changes?"
    description="What you changed here isn't saved yet."
    confirmText="Discard"
    cancelText="Keep editing"
    confirmVariant="destructive"
    onConfirm={onDiscard}
    onClose={onKeepEditing}
  />
);
