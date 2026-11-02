"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils/cn";

const Tooltip = TooltipPrimitive.Root;

/** Opens at once, as the chart's column tips do; Base UI waits 600ms by default. */
const OPEN_DELAY_MS = 0;

function TooltipTrigger({
  delay = OPEN_DELAY_MS,
  ...props
}: TooltipPrimitive.Trigger.Props) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      delay={delay}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "max-w-64 origin-(--transform-origin) rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-raised duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
