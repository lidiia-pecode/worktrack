"use client";

import { ComponentProps, ReactNode, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

import {
  addDays,
  formatDayMonthLabel,
  formatDayMonthYearLabel,
  fromISODate,
  toISODate,
} from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import {
  FieldControlSize,
  fieldControlSizeClassName,
} from "@/components/ui/field";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { calendarTabStop, MonthCalendar } from "../MonthCalendar";

/** "Oct 19 – Oct 23, 2026", or the one day. */
const formatDateRange = (startDate: string, endDate: string) =>
  startDate === endDate
    ? formatDayMonthYearLabel(startDate)
    : `${formatDayMonthLabel(startDate)} – ${formatDayMonthYearLabel(endDate)}`;

type DateFieldTriggerProps = ComponentProps<typeof PopoverTrigger> & {
  label: string;
  invalid?: boolean;
  /** `sm` in a toolbar, `md` (the default) in a row of fields. */
  size?: FieldControlSize;
};

/** The look of a button that opens a date picker, shared with the week nav. */
export const dateFieldClassName = (size: FieldControlSize, invalid = false) =>
  cn(
    "flex w-full min-w-0 items-center gap-2 border border-control-border px-3 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none",
    fieldControlSizeClassName[size],
    invalid && "border-destructive",
  );

/** The field a date picker opens from: the chosen date with a calendar icon. */
export const DateFieldTrigger = ({
  label,
  invalid = false,
  size = "md",
  className,
  ...props
}: DateFieldTriggerProps) => (
  <PopoverTrigger
    {...props}
    aria-invalid={invalid}
    className={cn(dateFieldClassName(size, invalid), className)}
  >
    <CalendarDays
      className="size-4 shrink-0 text-muted-foreground"
      aria-hidden
    />
    <span className="min-w-0 flex-1 truncate text-left">{label}</span>
    <ChevronDown
      className="size-4 shrink-0 text-muted-foreground"
      aria-hidden
    />
  </PopoverTrigger>
);

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  /** What the field shows; the dates by default. */
  label?: string;
  invalid?: boolean;
  /** The first and last day that can be chosen, as YYYY-MM-DD. */
  minDate?: string;
  maxDate?: string;
  /** The longest range, both ends counted; days past it can't end the range. */
  maxDays?: number;
  /** Opens the calendar as the picker appears, when choosing the range is the next step. */
  defaultOpen?: boolean;
  onChange: (startDate: string, endDate: string) => void;
  /** Shortcuts under the calendar. */
  children?: ReactNode;
  size?: FieldControlSize;
  className?: string;
};

/**
 * A range field that opens the month grid: the first click picks the first
 * day and the second the last. A click before the first day moves it; a
 * hovered or focused day previews the band. Escape and an outside click close
 * only the popover, so it can sit inside a dialog.
 */
export const DateRangePicker = ({
  startDate,
  endDate,
  label,
  invalid = false,
  minDate,
  maxDate,
  maxDays,
  defaultOpen = false,
  onChange,
  children,
  size = "md",
  className,
}: DateRangePickerProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [draftStart, setDraftStart] = useState<string | null>(null);
  const [previewEnd, setPreviewEnd] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const pickDay = (day: Date) => {
    const iso = toISODate(day);
    if (!draftStart || iso < draftStart) {
      setDraftStart(iso);
    } else {
      onChange(draftStart, iso);
      setOpen(false);
    }
  };

  const lastDayOfDraft =
    draftStart && maxDays
      ? toISODate(addDays(fromISODate(draftStart), maxDays - 1))
      : undefined;
  const lastDay =
    lastDayOfDraft && (!maxDate || lastDayOfDraft < maxDate)
      ? lastDayOfDraft
      : maxDate;

  const selection = draftStart
    ? {
        start: fromISODate(draftStart),
        end: fromISODate(
          previewEnd && previewEnd > draftStart ? previewEnd : draftStart,
        ),
      }
    : { start: fromISODate(startDate), end: fromISODate(endDate) };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setDraftStart(null);
        setPreviewEnd(null);
      }}
    >
      <DateFieldTrigger
        label={label ?? formatDateRange(startDate, endDate)}
        invalid={invalid}
        size={size}
        className={className}
      />

      <PopoverContent
        className="w-76"
        initialFocus={() => calendarTabStop(calendarRef.current)}
      >
        <div ref={calendarRef}>
          <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">
            {draftStart
              ? `From ${formatDayMonthLabel(draftStart)}. Now choose the last day.`
              : "Choose the first day, then the last."}
          </p>

          <MonthCalendar
            initialMonth={fromISODate(startDate)}
            selection={selection}
            selectionLabel="in the period"
            autoFocusDate={fromISODate(startDate)}
            minDate={minDate ? fromISODate(minDate) : undefined}
            maxDate={lastDay ? fromISODate(lastDay) : undefined}
            onSelectDay={pickDay}
            onHoverDay={(day) => setPreviewEnd(day && toISODate(day))}
          />

          {children && (
            <div className="mt-3 border-t border-border/60 pt-3">
              {children}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
