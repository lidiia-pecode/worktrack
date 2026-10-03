"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CONFIRM_BUTTON_VARIANT = {
  default: "primary",
  warning: "warning",
  danger: "destructive",
} as const;

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  confirmDisabled?: boolean;
  /** `warning` for an action that is hard to undo, `danger` for one that removes something. */
  variant?: keyof typeof CONFIRM_BUTTON_VARIANT;
}

export const ConfirmModal = ({
  isOpen,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
  loading = false,
  confirmDisabled = false,
  variant = "default",
}: ConfirmModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
        <DialogHeader className="p-6 pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={CONFIRM_BUTTON_VARIANT[variant]}
            size="sm"
            onClick={onConfirm}
            isLoading={loading}
            disabled={confirmDisabled}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
