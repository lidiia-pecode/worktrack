"use client";

import { ReactNode } from "react";

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
import { useDiscardGuard } from "../useDiscardGuard";

interface ResourceFormModalProps {
  open: boolean;
  onClose: () => void;

  /** The action: "Log time", "Plan a period", "Add absence". */
  title: string;
  /** Who and when, then the state: "Jane Smith · Wednesday, November 4 · 2h of an 8h day planned". */
  description?: string;
  /** A control at the header's end, such as the time entry's duration. */
  headerEnd?: ReactNode;

  /** `md` for one column, `lg` for two columns or a wide row. */
  size?: "md" | "lg";
  footer?: ReactNode;
  /**
   * Closing by Escape or an outside click asks first while this is true.
   * The form's own Cancel calls `onClose` directly and discards without asking.
   */
  hasUnsavedChanges?: boolean;
  /** While a save is in flight, Escape and an outside click do nothing. */
  isBusy?: boolean;

  children: ReactNode;
}

const sizeClass: Record<NonNullable<ResourceFormModalProps["size"]>, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
};

/**
 * The frame of the work dialogs: one header (the action, who and when
 * beneath, a control at the end), a body that scrolls, and a footer whose
 * buttons are the only way to close, so the header has no close button.
 */
export const ResourceFormModal = ({
  open,
  onClose,
  title,
  description,
  headerEnd,
  size = "md",
  footer,
  hasUnsavedChanges = false,
  isBusy = false,
  children,
}: ResourceFormModalProps) => {
  const { dismiss, discardDialog } = useDiscardGuard({
    hasUnsavedChanges,
    isBusy,
    onClose,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => !value && dismiss()}>
        <DialogContent className={sizeClass[size]}>
          <DialogHeader className="border-b border-border px-6 py-4">
            <div
              className={cn(
                "flex gap-4",
                headerEnd ? "items-center" : "items-start",
              )}
            >
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base leading-tight font-semibold text-foreground">
                  {title}
                </DialogTitle>

                {description && (
                  <DialogDescription className="mt-0.5 text-sm leading-5 text-muted-foreground">
                    {description}
                  </DialogDescription>
                )}
              </div>

              {headerEnd && <div className="shrink-0">{headerEnd}</div>}
            </div>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-y-auto px-6 py-6">
            {children}
          </div>

          {footer && <DialogFooter>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>

      <DiscardChangesModal {...discardDialog} />
    </>
  );
};
