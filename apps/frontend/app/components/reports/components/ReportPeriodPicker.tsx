"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import {
  canStepBack,
  periodLabel,
  periodRange,
  ReportPeriod,
  ReportPeriodUnit,
  stepPeriod,
  switchUnit,
} from "@/lib/utils/report-period";

import { Button } from "@/components/ui/button";

import { DateRangePicker } from "../../shared/inputs";

const UNITS: { unit: ReportPeriodUnit; label: string }[] = [
  { unit: "month", label: "Month" },
  { unit: "quarter", label: "Quarter" },
  { unit: "year", label: "Year" },
];

type ReportPeriodPickerProps = {
  period: ReportPeriod;
  /** YYYY-MM, where the company is. */
  currentMonth: string;
  /** Stepping back stops here; unknown until the company has loaded. */
  companyFirstMonth?: string;
  error?: string;
  onChange: (period: ReportPeriod) => void;
};

/**
 * A month, quarter or year stepped with the arrows, like the week on Team
 * time; the date opens the range calendar for any other period, and picking a
 * unit again returns to stepping.
 */
export const ReportPeriodPicker = ({
  period,
  currentMonth,
  companyFirstMonth,
  error,
  onChange,
}: ReportPeriodPickerProps) => {
  const { dateFrom, dateTo } = periodRange(period);
  const { name, detail } = periodLabel(period, currentMonth);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Period length"
        className="flex h-8 overflow-hidden rounded-lg border border-border"
      >
        {UNITS.map(({ unit, label }) => (
          <button
            key={unit}
            type="button"
            aria-pressed={period.unit === unit}
            onClick={() => onChange(switchUnit(period, unit, currentMonth))}
            className={cn(
              "border-l border-border px-3 text-sm transition first:border-l-0",
              "focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none focus-visible:ring-inset",
              period.unit === unit
                ? "bg-accent font-semibold text-accent-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {period.unit !== "custom" && (
        <div className="flex items-center overflow-hidden rounded-lg border border-border">
          <Button
            variant="ghost"
            size="iconSm"
            className="w-9 rounded-none"
            aria-label={`Previous ${period.unit}`}
            disabled={!canStepBack(period, companyFirstMonth)}
            onClick={() => onChange(stepPeriod(period, -1))}
          >
            <ChevronLeft size={16} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            className="w-9 rounded-none border-0 border-l border-border"
            aria-label={`Next ${period.unit}`}
            onClick={() => onChange(stepPeriod(period, 1))}
          >
            <ChevronRight size={16} aria-hidden />
          </Button>
        </div>
      )}

      <DateRangePicker
        startDate={dateFrom}
        endDate={dateTo}
        label={
          <>
            {name}
            {detail && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                {detail}
              </span>
            )}
          </>
        }
        invalid={Boolean(error)}
        onChange={(startDate, endDate) =>
          onChange({ unit: "custom", dateFrom: startDate, dateTo: endDate })
        }
        className={cn(
          "h-8 w-auto",
          period.unit === "custom" && !error && "border-brand",
        )}
      />

      {error && (
        <p className="text-xs text-destructive-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
