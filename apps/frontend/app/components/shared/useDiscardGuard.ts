"use client";

import { useState } from "react";

type DiscardGuardOptions = {
  /** While true, Escape and an outside click ask before the form is lost. */
  hasUnsavedChanges: boolean;
  /** While true, Escape and an outside click do nothing, as the buttons already do. */
  isBusy?: boolean;
  onClose: () => void;
};

/**
 * What every dialog does when Escape or an outside click asks it to close:
 * closes at once, waits while a save is in flight, or asks "Discard your
 * changes?" first. The footer's own Cancel bypasses it and calls `onClose`.
 */
export const useDiscardGuard = ({
  hasUnsavedChanges,
  isBusy = false,
  onClose,
}: DiscardGuardOptions) => {
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);

  const dismiss = () => {
    if (isBusy) return;
    if (hasUnsavedChanges) setIsConfirmingDiscard(true);
    else onClose();
  };

  const discardDialog = {
    isOpen: isConfirmingDiscard,
    onDiscard: () => {
      setIsConfirmingDiscard(false);
      onClose();
    },
    onKeepEditing: () => setIsConfirmingDiscard(false),
  };

  return { dismiss, discardDialog };
};
