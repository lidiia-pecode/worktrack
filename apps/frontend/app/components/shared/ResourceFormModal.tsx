"use client";

import { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

interface ResourceFormModalProps {
  open: boolean;
  onClose: () => void;

  title: string;
  description?: string;
  icon?: ReactNode;

  size?: "md" | "lg";
  footer?: ReactNode;

  children: ReactNode;
}

const sizeClass: Record<NonNullable<ResourceFormModalProps["size"]>, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
};

export function ResourceFormModal({
  open,
  onClose,
  title,
  description,
  icon,
  size = "md",
  footer,
  children,
}: ResourceFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        className={cn("gap-0 overflow-hidden p-0", sizeClass[size])}
      >
        <DialogHeader className="border-b border-border px-6 py-5">
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

        <div className="max-h-[65vh] overflow-y-auto px-6 py-6">{children}</div>

        {footer && (
          <div className="border-t border-border bg-muted/30 px-6 py-4">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
