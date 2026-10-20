"use client";

import { ReactNode, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

import {
  formatDayMonthLabel,
  formatDayMonthYearLabel,
  toISODate,
} from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { MonthCalendar } from "../MonthCalendar";

const toDate = (iso: string) => new Date(`${iso}T00:00:00`);

/** "Oct 19 – Oct 23, 2026", or the one day. */
export const formatDateRange = (startDate: string, endDate: string) =>
  startDate === endDate
    ? formatDayMonthYearLabel(startDate)
    : `${formatDayMonthLabel(startDate)} – ${formatDayMonthYearLabel(endDate)}`;

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  /** What the field shows; the dates by default. */
  label?: string;
  invalid?: boolean;
  onChange: (startDate: string, endDate: string) => void;
  /** Shortcuts under the calendar. */
  children?: ReactNode;
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
  onChange,
  children,
  className,
}: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);
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

  const selection = draftStart
    ? {
        start: toDate(draftStart),
        end: toDate(
          previewEnd && previewEnd > draftStart ? previewEnd : draftStart,
        ),
      }
    : { start: toDate(startDate), end: toDate(endDate) };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setDraftStart(null);
        setPreviewEnd(null);
      }}
    >
      <PopoverTrigger
        aria-invalid={invalid}
        className={cn(
          "flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none",
          invalid && "border-destructive",
          className,
        )}
      >
        <CalendarDays
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-left">
          {label ?? formatDateRange(startDate, endDate)}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </PopoverTrigger>

      <PopoverContent
        className="w-76"
        initialFocus={() =>
          calendarRef.current?.querySelector<HTMLElement>(
            '[data-date][tabindex="0"]',
          ) ?? true
        }
      >
        <div ref={calendarRef}>
          <p className="mb-2 text-xs text-muted-foreground" aria-live="polite">
            {draftStart
              ? `From ${formatDayMonthLabel(draftStart)}. Now choose the last day.`
              : "Choose the first day, then the last."}
          </p>

          <MonthCalendar
            initialMonth={toDate(startDate)}
            selection={selection}
            selectionLabel="in the period"
            autoFocusDate={toDate(startDate)}
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
