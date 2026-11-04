"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";

const stepButtonClassName =
  "h-4 w-5 rounded-sm p-0 text-muted-foreground disabled:opacity-30";

type NumberStepperProps = {
  /** What is stepped, read out with the direction: "Increase: Hours". */
  label: string;
  canIncrease: boolean;
  canDecrease: boolean;
  onStep: (direction: 1 | -1) => void;
};

/**
 * The small chevrons beside a number: the pointer's way to step, out of the
 * Tab order since the arrow keys step the field itself.
 */
export const NumberStepper = ({
  label,
  canIncrease,
  canDecrease,
  onStep,
}: NumberStepperProps) => (
  <div className="flex flex-col">
    <Button
      type="button"
      variant="ghost"
      tabIndex={-1}
      aria-label={`Increase: ${label}`}
      disabled={!canIncrease}
      className={stepButtonClassName}
      onClick={() => onStep(1)}
    >
      <ChevronUp className="size-3" />
    </Button>

    <Button
      type="button"
      variant="ghost"
      tabIndex={-1}
      aria-label={`Decrease: ${label}`}
      disabled={!canDecrease}
      className={stepButtonClassName}
      onClick={() => onStep(-1)}
    >
      <ChevronDown className="size-3" />
    </Button>
  </div>
);
