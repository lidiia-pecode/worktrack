import { ComponentProps, forwardRef } from "react";

import { cn } from "@/lib/utils/cn";

/** An on/off setting: a checkbox drawn as a switch, labelled by the label around it. */
export const Switch = forwardRef<
  HTMLInputElement,
  Omit<ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => (
  <span className={cn("relative inline-flex shrink-0", className)}>
    <input
      ref={ref}
      type="checkbox"
      role="switch"
      className="peer sr-only"
      {...props}
    />
    <span
      aria-hidden="true"
      className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40 peer-disabled:opacity-50"
    />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-card shadow-xs transition-transform peer-checked:translate-x-4"
    />
  </span>
));
Switch.displayName = "Switch";
