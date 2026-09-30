import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

interface FormAlertProps {
  children: ReactNode;
  className?: string;
}

/** An error about the whole form rather than one field. */
export const FormAlert = ({ children, className }: FormAlertProps) => (
  <div
    role="alert"
    className={cn(
      "rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive-text",
      className,
    )}
  >
    {children}
  </div>
);
