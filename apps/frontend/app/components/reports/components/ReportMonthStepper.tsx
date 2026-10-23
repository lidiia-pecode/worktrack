"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { addMonthsToKey, formatMonthLabel } from "@/lib/utils/date";

import { Button } from "@/components/ui/button";

type ReportMonthStepperProps = {
  /** YYYY-MM. */
  month: string;
  /** YYYY-MM where the company is; the arrows stop here. */
  currentMonth: string;
  /** Stepping back stops here; unknown until the company has loaded. */
  companyFirstMonth?: string;
  onChange: (month: string) => void;
};

/** One month at a time, stepped with the arrows, like the week on Team time. */
export const ReportMonthStepper = ({
  month,
  currentMonth,
  companyFirstMonth,
  onChange,
}: ReportMonthStepperProps) => (
  <div className="flex items-center gap-3">
    <div className="flex items-center overflow-hidden rounded-lg border border-border">
      <Button
        variant="ghost"
        size="iconSm"
        className="w-9 rounded-none"
        aria-label="Previous month"
        disabled={Boolean(companyFirstMonth) && month <= companyFirstMonth!}
        onClick={() => onChange(addMonthsToKey(month, -1))}
      >
        <ChevronLeft size={16} aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="iconSm"
        className="w-9 rounded-none border-0 border-l border-border"
        aria-label="Next month"
        disabled={month >= currentMonth}
        onClick={() => onChange(addMonthsToKey(month, 1))}
      >
        <ChevronRight size={16} aria-hidden />
      </Button>
    </div>
    <p className="text-base font-semibold" aria-live="polite">
      {formatMonthLabel(month)}
    </p>
  </div>
);
