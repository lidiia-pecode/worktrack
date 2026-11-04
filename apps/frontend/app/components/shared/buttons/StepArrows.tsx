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

/** The pair of arrows that steps a week, a month or a period, as one group. */
export const StepArrows = ({
  unit,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
}: StepArrowsProps) => (
  <div className="flex items-center overflow-hidden rounded-md border border-control-border max-sm:rounded-lg">
    <Button
      variant="ghost"
      size="iconSm"
      className="w-9 rounded-none focus-visible:ring-inset max-sm:size-10"
      aria-label={`Previous ${unit}`}
      disabled={previousDisabled}
      onClick={onPrevious}
    >
      <ChevronLeft size={16} aria-hidden />
    </Button>
    <Button
      variant="ghost"
      size="iconSm"
      className="w-9 rounded-none border-0 border-l border-control-border focus-visible:ring-inset max-sm:size-10"
      aria-label={`Next ${unit}`}
      disabled={nextDisabled}
      onClick={onNext}
    >
      <ChevronRight size={16} aria-hidden />
    </Button>
  </div>
);
