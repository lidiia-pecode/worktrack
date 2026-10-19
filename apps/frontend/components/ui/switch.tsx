import { ComponentProps, forwardRef } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * An on/off setting: a checkbox drawn as a switch. The checkbox covers the
 * drawing, so the switch toggles on its own as well as from its label.
 */
export const Switch = forwardRef<
  HTMLInputElement,
  Omit<ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => (
  <span className={cn("relative inline-flex shrink-0", className)}>
    <input
      ref={ref}
      type="checkbox"
      role="switch"
      className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      {...props}
    />
    <span
      aria-hidden="true"
      className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:opacity-50"
    />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-card shadow-xs transition-transform peer-checked:translate-x-4"
    />
  </span>
));
Switch.displayName = "Switch";
