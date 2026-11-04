"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  addDays,
  addMonthsToKey,
  formatMonthLabel,
  fromISODate,
  getMonthRange,
  toISODate,
  toMonthKey,
} from "@/lib/utils/date";

import { Button } from "@/components/ui/button";

import { SegmentedControl } from "../../shared/SegmentedControl";
import { DateRangePicker } from "../../shared/inputs";

type PeriodUnit = "week" | "month";

const UNITS: { value: PeriodUnit; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const isWholeMonth = (startDate: string, endDate: string) => {
  const { dateFrom, dateTo } = getMonthRange(toMonthKey(startDate));
  return startDate === dateFrom && endDate === dateTo;
};

type PeriodPickerProps = {
  startDate: string;
  endDate: string;
  weekDates: Date[];
  invalid: boolean;
  onChange: (startDate: string, endDate: string) => void;
};

/**
 * The dates with their arrows, and the unit the arrows step by, Week or
 * Month: pressing a unit also jumps to it, the shown week or the month that
 * holds the dates. A range picked in the calendar through the label keeps
 * the unit, so the arrows still move it by a week or a month.
 */
export const PeriodPicker = ({
  startDate,
  endDate,
  weekDates,
  invalid,
  onChange,
}: PeriodPickerProps) => {
  const [unit, setUnit] = useState<PeriodUnit>(() =>
    isWholeMonth(startDate, endDate) ? "month" : "week",
  );
  const monthKey = toMonthKey(startDate);

  const pickMonth = (key: string) => {
    const { dateFrom, dateTo } = getMonthRange(key);
    onChange(dateFrom, dateTo);
  };

  const pickUnit = (next: PeriodUnit) => {
    setUnit(next);
    if (next === "week") {
      onChange(
        toISODate(weekDates[0]),
        toISODate(weekDates[weekDates.length - 1]),
      );
    } else {
      pickMonth(monthKey);
    }
  };

  const step = (direction: 1 | -1) => {
    if (unit === "week") {
      onChange(
        toISODate(addDays(fromISODate(startDate), 7 * direction)),
        toISODate(addDays(fromISODate(endDate), 7 * direction)),
      );
    } else {
      pickMonth(addMonthsToKey(monthKey, direction));
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-1 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Previous ${unit}`}
          onClick={() => step(-1)}
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
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Next ${unit}`}
          onClick={() => step(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <SegmentedControl
        label="Step by"
        options={UNITS}
        value={unit}
        onChange={pickUnit}
        className="shrink-0"
      />
    </div>
  );
};
