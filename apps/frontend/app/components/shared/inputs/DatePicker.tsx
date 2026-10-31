"use client";

import { useId, useRef, useState } from "react";

import { Field } from "@/components/ui/field";
import { Popover, PopoverContent } from "@/components/ui/popover";
import {
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
      <Popover open={open} onOpenChange={setOpen}>
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
