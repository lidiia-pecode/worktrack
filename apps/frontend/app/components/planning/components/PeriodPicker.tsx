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

type PeriodShape = "week" | "month" | "custom";

const SHAPES: { value: PeriodShape; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "Full month" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const daysBetween = (from: string, to: string) =>
  Math.round(
    (fromISODate(to).getTime() - fromISODate(from).getTime()) / DAY_MS,
  );

const isWholeMonth = (startDate: string, endDate: string) => {
  const { dateFrom, dateTo } = getMonthRange(toMonthKey(startDate));
  return startDate === dateFrom && endDate === dateTo;
};

type PeriodPickerProps = {
  startDate: string;
  endDate: string;
  /** The working days of the week shown on Planning: what "This week" means. */
  weekDates: Date[];
  invalid: boolean;
  onChange: (startDate: string, endDate: string) => void;
};

/**
 * The shown week or its whole month by the toggle, the arrows stepping by
 * whichever shape the range has (a week's working days, or else a month);
 * the label opens the shared range picker for any other period, which
 * leaves neither segment pressed.
 */
export const PeriodPicker = ({
  startDate,
  endDate,
  weekDates,
  invalid,
  onChange,
}: PeriodPickerProps) => {
  const shownWeek = {
    dateFrom: toISODate(weekDates[0]),
    dateTo: toISODate(weekDates[weekDates.length - 1]),
  };
  const isShownWeek =
    startDate === shownWeek.dateFrom && endDate === shownWeek.dateTo;
  // The shown week stepped by whole weeks keeps its shape, so the arrows keep
  // stepping by a week.
  const isWeekShaped =
    daysBetween(startDate, endDate) ===
      daysBetween(shownWeek.dateFrom, shownWeek.dateTo) &&
    daysBetween(shownWeek.dateFrom, startDate) % 7 === 0;
  const shape: PeriodShape = isShownWeek
    ? "week"
    : isWholeMonth(startDate, endDate)
      ? "month"
      : "custom";
  const stepsByWeek = isWeekShaped && !isWholeMonth(startDate, endDate);
  const monthKey = toMonthKey(startDate);

  const pickMonth = (key: string) => {
    const { dateFrom, dateTo } = getMonthRange(key);
    onChange(dateFrom, dateTo);
  };

  const step = (direction: 1 | -1) => {
    if (stepsByWeek) {
      onChange(
        toISODate(addDays(fromISODate(startDate), 7 * direction)),
        toISODate(addDays(fromISODate(endDate), 7 * direction)),
      );
    } else {
      pickMonth(addMonthsToKey(monthKey, direction));
    }
  };

  const pickShape = (next: PeriodShape) => {
    if (next === "week") onChange(shownWeek.dateFrom, shownWeek.dateTo);
    if (next === "month") pickMonth(monthKey);
  };

  const unit = stepsByWeek ? "week" : "month";

  return (
    <div className="flex items-center gap-2">
      <SegmentedControl
        label="Period"
        options={SHAPES}
        value={shape}
        onChange={pickShape}
        className="h-11 shrink-0"
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label={`Previous ${unit}`}
        onClick={() => step(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        label={shape === "month" ? formatMonthLabel(monthKey) : undefined}
        invalid={invalid}
        onChange={onChange}
        className="flex-1"
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11"
        aria-label={`Next ${unit}`}
        onClick={() => step(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
};
