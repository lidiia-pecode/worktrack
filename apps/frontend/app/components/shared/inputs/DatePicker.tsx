"use client";

import { useId, useRef, useState } from "react";

import { Field } from "@/components/ui/field";
import { Popover, PopoverContent } from "@/components/ui/popover";
import {
  firstOfMonth,
  formatDayMonthYearLabel,
  fromISODate,
  toISODate,
} from "@/lib/utils/date";

import { MonthCalendar } from "../MonthCalendar";
import { DateFieldTrigger } from "./DateRangePicker";

type DatePickerProps = {
  /** YYYY-MM-DD. */
  value: string;
  onChange: (date: string) => void;
  /** The earliest day that can be chosen, YYYY-MM-DD. */
  minDate?: string | null;
  /** The latest day that can be chosen, YYYY-MM-DD. */
  maxDate?: string | null;
  /** Days inside the limits that can't be chosen, YYYY-MM-DD. */
  isDayDisabled?: (date: string) => boolean;
  /** The first of the month the calendar shows, YYYY-MM-DD: as it opens and as it moves. */
  onMonthChange?: (month: string) => void;
  label?: string;
  description?: string;
  error?: string;
  className?: string;
};

/** One day, chosen on the same month grid as `DateRangePicker`; a click picks it and closes. */
export const DatePicker = ({
  value,
  onChange,
  minDate,
  maxDate,
  isDayDisabled,
  onMonthChange,
  label,
  description,
  error,
  className,
}: DatePickerProps) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const day = fromISODate(value);

  return (
    <Field
      id={id}
      label={label}
      description={description}
      error={error}
      group
      className={className}
    >
      <Popover
        open={open}
        onOpenChange={(isOpening) => {
          setOpen(isOpening);
          if (isOpening) onMonthChange?.(toISODate(firstOfMonth(day)));
        }}
      >
        <DateFieldTrigger
          label={formatDayMonthYearLabel(value)}
          invalid={!!error}
        />

        <PopoverContent
          className="w-76"
          initialFocus={() =>
            calendarRef.current?.querySelector<HTMLElement>(
              '[data-date][tabindex="0"]',
            ) ?? true
          }
        >
          <div ref={calendarRef}>
            <MonthCalendar
              initialMonth={day}
              selection={{ start: day, end: day }}
              selectionLabel="selected"
              autoFocusDate={day}
              minDate={minDate ? fromISODate(minDate) : undefined}
              maxDate={maxDate ? fromISODate(maxDate) : undefined}
              isDayDisabled={
                isDayDisabled && ((day) => isDayDisabled(toISODate(day)))
              }
              onMonthChange={
                onMonthChange && ((month) => onMonthChange(toISODate(month)))
              }
              onSelectDay={(picked) => {
                onChange(toISODate(picked));
                setOpen(false);
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
};
