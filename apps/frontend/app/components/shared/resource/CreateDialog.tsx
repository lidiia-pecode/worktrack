"use client";

import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Small, above the form, such as "New project". */
  title: string;
  /** What comes after, beside the buttons, such as adding its people. */
  next?: string;
  formId: string;
  submitLabel: string;
  isSubmitting: boolean;
  submitDisabled?: boolean;
  /** The form, its name field first, set as the heading it becomes. */
  children: ReactNode;
}

/**
 * The first step of a new entity: its name and the few choices it can't
 * exist without. The rest is set in its panel, which opens next.
 */
export const CreateDialog = ({
  open,
  onClose,
  title,
  next,
  formId,
  submitLabel,
  isSubmitting,
  submitDisabled = false,
  children,
}: CreateDialogProps) => (
  <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
      <DialogTitle className="px-6 pt-6 pr-12 text-2xs font-medium tracking-wider text-muted-foreground uppercase">
        {title}
      </DialogTitle>

      <div className="max-h-[65vh] overflow-y-auto px-6 pt-3 pb-6">
        {children}
      </div>

      <DialogFooter>
        {next && (
          <DialogDescription className="mr-auto text-xs">
            {next}
          </DialogDescription>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          form={formId}
          size="sm"
          isLoading={isSubmitting}
          disabled={submitDisabled}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
