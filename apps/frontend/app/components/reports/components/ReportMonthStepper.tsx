"use client";

import { addMonthsToKey, toMonthKey } from "@/lib/utils/date";
import { periodOf } from "@/lib/utils/shown-period";

import { StepArrows } from "@/app/components/shared/buttons/StepArrows";

import { CalendarPeriodPicker } from "./ReportPeriodControl";

type ReportMonthStepperProps = {
  /** YYYY-MM. */
  month: string;
  /** The company's today; no later day can be picked. */
  today: string;
  /** YYYY-MM where the company is; the arrows stop here. */
  currentMonth: string;
  /** Stepping back stops here; unknown until the company has loaded. */
  companyFirstMonth?: string;
  onChange: (month: string) => void;
};

/**
 * One month at a time, stepped with the arrows or picked in the calendar, as
 * Reports picks its month and Team time its week.
 */
export const ReportMonthStepper = ({
  month,
  today,
  currentMonth,
  companyFirstMonth,
  onChange,
}: ReportMonthStepperProps) => (
  <div className="flex items-center gap-2">
    <StepArrows
      unit="month"
      previousDisabled={
        companyFirstMonth !== undefined && month <= companyFirstMonth
      }
      nextDisabled={month >= currentMonth}
      onPrevious={() => onChange(addMonthsToKey(month, -1))}
      onNext={() => onChange(addMonthsToKey(month, 1))}
    />

    <CalendarPeriodPicker
      period={periodOf("month", `${month}-01`)}
      unit="month"
      today={today}
      firstDay={companyFirstMonth && `${companyFirstMonth}-01`}
      onChange={(period) => onChange(toMonthKey(period.range.dateFrom))}
    />
  </div>
);
