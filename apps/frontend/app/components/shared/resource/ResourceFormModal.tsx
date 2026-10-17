"use client";

import { ReactNode, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

import { DiscardChangesModal } from "../DiscardChangesModal";

interface ResourceFormModalProps {
  open: boolean;
  onClose: () => void;

  title: string;
  description?: string;
  icon?: ReactNode;

  size?: "md" | "lg";
  footer?: ReactNode;
  bodyPadding?: boolean;
  /**
   * Closing by Escape, an outside click or × asks first while this is true.
   * The form's own Cancel calls `onClose` directly and discards without asking.
   */
  hasUnsavedChanges?: boolean;

  children: ReactNode;
}

const sizeClass: Record<NonNullable<ResourceFormModalProps["size"]>, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
};

export const ResourceFormModal = ({
  open,
  onClose,
  title,
  description,
  icon,
  size = "md",
  footer,
  bodyPadding = true,
  hasUnsavedChanges = false,
  children,
}: ResourceFormModalProps) => {
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);

  const dismiss = () => {
    if (hasUnsavedChanges) setIsConfirmingDiscard(true);
    else onClose();
  };

  const discard = () => {
    setIsConfirmingDiscard(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => !value && dismiss()}>
        <DialogContent
          className={cn("gap-0 overflow-hidden p-0", sizeClass[size])}
        >
          <DialogHeader className="border-b border-border py-5 pr-12 pl-6">
            <div className="flex items-start gap-3">
              {icon && (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand">
                  {icon}
                </div>
              )}

              <div className="min-w-0">
                <DialogTitle className="truncate text-base text-foreground">
                  {title}
                </DialogTitle>

                {description && (
                  <DialogDescription className="mt-1 text-sm leading-5 text-muted-foreground">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <div
            className={cn(
              "max-h-[65vh] overflow-y-auto",
              bodyPadding && "px-6 py-6",
            )}
          >
            {children}
          </div>

          {footer && <DialogFooter>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>

      <DiscardChangesModal
        isOpen={isConfirmingDiscard}
        onDiscard={discard}
        onKeepEditing={() => setIsConfirmingDiscard(false)}
      />
    </>
  );
};
