"use client";

import { addMonthsToKey, formatMonthLabel } from "@/lib/utils/date";

import { StepArrows } from "@/app/components/shared/buttons/StepArrows";

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
    <StepArrows
      unit="month"
      previousDisabled={
        companyFirstMonth !== undefined && month <= companyFirstMonth
      }
      nextDisabled={month >= currentMonth}
      onPrevious={() => onChange(addMonthsToKey(month, -1))}
      onNext={() => onChange(addMonthsToKey(month, 1))}
    />
    <p className="text-base font-semibold" aria-live="polite">
      {formatMonthLabel(month)}
    </p>
  </div>
);
