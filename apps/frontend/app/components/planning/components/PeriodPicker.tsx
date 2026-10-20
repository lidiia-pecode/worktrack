"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  addMonthsToKey,
  formatMonthLabel,
  getMonthRange,
  toMonthKey,
} from "@/lib/utils/date";

import { Button } from "@/components/ui/button";

import { DateRangePicker } from "../../shared/inputs";

const isWholeMonth = (startDate: string, endDate: string) => {
  const { dateFrom, dateTo } = getMonthRange(toMonthKey(startDate));
  return startDate === dateFrom && endDate === dateTo;
};

type PeriodPickerProps = {
  startDate: string;
  endDate: string;
  invalid: boolean;
  onChange: (startDate: string, endDate: string) => void;
};

/**
 * A month at a time with the arrows; the label opens the shared range picker
 * for any other period.
 */
export const PeriodPicker = ({
  startDate,
  endDate,
  invalid,
  onChange,
}: PeriodPickerProps) => {
  const monthKey = toMonthKey(startDate);

  const pickMonth = (key: string) => {
    const { dateFrom, dateTo } = getMonthRange(key);
    onChange(dateFrom, dateTo);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label="Previous month"
        onClick={() => pickMonth(addMonthsToKey(monthKey, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        label={
          isWholeMonth(startDate, endDate)
            ? formatMonthLabel(monthKey)
            : undefined
        }
        invalid={invalid}
        onChange={onChange}
        className="flex-1"
      >
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-brand"
          onClick={() => pickMonth(monthKey)}
        >
          Whole {formatMonthLabel(monthKey)}
        </Button>
      </DateRangePicker>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label="Next month"
        onClick={() => pickMonth(addMonthsToKey(monthKey, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
};
