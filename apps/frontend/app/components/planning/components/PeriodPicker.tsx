"use client";

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

export type PeriodUnit = "week" | "month";

const UNITS: { value: PeriodUnit; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** The month holding most of the dates: December for Mon 30 Nov – Fri 4 Dec. */
const mostDaysMonth = (startDate: string, endDate: string) => {
  const daysByMonth = new Map<string, number>();
  for (
    let day = fromISODate(startDate);
    toISODate(day) <= endDate;
    day = addDays(day, 1)
  ) {
    const key = toMonthKey(toISODate(day));
    daysByMonth.set(key, (daysByMonth.get(key) ?? 0) + 1);
  }

  let monthKey = toMonthKey(startDate);
  for (const [key, days] of daysByMonth) {
    if (days > (daysByMonth.get(monthKey) ?? 0)) monthKey = key;
  }
  return monthKey;
};

const isWholeMonth = (startDate: string, endDate: string) => {
  const { dateFrom, dateTo } = getMonthRange(toMonthKey(startDate));
  return startDate === dateFrom && endDate === dateTo;
};

type PeriodPickerProps = {
  startDate: string;
  endDate: string;
  weekDates: Date[];
  /** What the arrows step by; the dialog changes it with the dates it jumps to. */
  unit: PeriodUnit;
  invalid: boolean;
  /** With a unit when a press of Week or Month asked for these dates. */
  onChange: (startDate: string, endDate: string, unit?: PeriodUnit) => void;
};

/**
 * The dates with their arrows, and the unit the arrows step by, Week or
 * Month: pressing a unit also jumps to it, the shown week or the month that
 * holds most of the dates. A range picked in the calendar through the label keeps
 * the unit, so the arrows still move it by a week or a month.
 */
export const PeriodPicker = ({
  startDate,
  endDate,
  weekDates,
  unit,
  invalid,
  onChange,
}: PeriodPickerProps) => {
  const monthKey = mostDaysMonth(startDate, endDate);

  const monthDates = (key: string) => {
    const { dateFrom, dateTo } = getMonthRange(key);
    return [dateFrom, dateTo] as const;
  };

  const pickUnit = (next: PeriodUnit) => {
    if (next === "week") {
      onChange(
        toISODate(weekDates[0]),
        toISODate(weekDates[weekDates.length - 1]),
        next,
      );
    } else {
      onChange(...monthDates(monthKey), next);
    }
  };

  const step = (direction: 1 | -1) => {
    if (unit === "week") {
      onChange(
        toISODate(addDays(fromISODate(startDate), 7 * direction)),
        toISODate(addDays(fromISODate(endDate), 7 * direction)),
      );
    } else {
      onChange(...monthDates(addMonthsToKey(monthKey, direction)));
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
