"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type StepArrowsProps = {
  /** What a step moves by, for the arrows' names: "week", "month", "period". */
  unit: string;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
};

/**
 * The pair of arrows that steps a week, a month or a period, as one group, as
 * tall as the controls beside it: the group's border is inside its height.
 */
export const StepArrows = ({
  unit,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
}: StepArrowsProps) => (
  <div className="flex h-8 items-stretch overflow-hidden rounded-md border border-control-border max-sm:h-10 max-sm:rounded-lg">
    <Button
      variant="ghost"
      size="iconSm"
      className="h-auto w-9 rounded-none focus-visible:ring-inset max-sm:h-auto max-sm:w-10"
      aria-label={`Previous ${unit}`}
      disabled={previousDisabled}
      onClick={onPrevious}
    >
      <ChevronLeft size={16} aria-hidden />
    </Button>
    <Button
      variant="ghost"
      size="iconSm"
      className="h-auto w-9 rounded-none border-0 border-l border-control-border focus-visible:ring-inset max-sm:h-auto max-sm:w-10"
      aria-label={`Next ${unit}`}
      disabled={nextDisabled}
      onClick={onNext}
    >
      <ChevronRight size={16} aria-hidden />
    </Button>
  </div>
);
