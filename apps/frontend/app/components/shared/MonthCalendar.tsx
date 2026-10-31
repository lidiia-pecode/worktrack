"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  addDays,
  firstOfMonth,
  formatLongDayLabel,
  formatWeekdayLabel,
  getMonthGridDates,
  getWeekDates,
  getWeekStart,
  isSameDay,
  isToday,
  toISODate,
} from "@/lib/utils/date";
import { useWorkSettings } from "@/hooks/useWorkSettings";

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

const ARROW_STEP_DAYS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

type MonthCalendarProps = {
  initialMonth: Date;
  /** The chosen days, drawn as one band with both ends in bold. */
  selection?: { start: Date; end: Date };
  /** Read out after a chosen day, e.g. "selected week". */
  selectionLabel: string;
  /** Where Tab lands in the grid, and focused as a popover opens. */
  autoFocusDate?: Date;
  /** The earliest day that can be chosen; earlier ones stay focusable but inert. */
  minDate?: Date;
  onSelectDay: (day: Date) => void;
  /** The day under the pointer or keyboard focus, null once it leaves. */
  onHoverDay?: (day: Date | null) => void;
};

/**
 * A month of days in the company's week order, with month navigation. One day
 * is in the Tab order and the arrow keys move between days, across months.
 */
export const MonthCalendar = ({
  initialMonth,
  selection,
  selectionLabel,
  autoFocusDate,
  minDate,
  onSelectDay,
  onHoverDay,
}: MonthCalendarProps) => {
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [focusDate, setFocusDate] = useState(
    autoFocusDate ?? selection?.start ?? initialMonth,
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const focusAfterRender = useRef(false);
  const { weekStartDay, timezone } = useWorkSettings();

  const days = getMonthGridDates(viewMonth, weekStartDay);
  const weekdayHeaders = getWeekDates(
    getWeekStart(new Date(), weekStartDay),
  ).map(formatWeekdayLabel);

  // After the month buttons move away from the focused day, Tab lands on the
  // month's first day instead.
  const tabStop = days.some((day) => isSameDay(day, focusDate))
    ? focusDate
    : firstOfMonth(viewMonth);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = ARROW_STEP_DAYS[event.key];
    if (!step) return;

    event.preventDefault();
    const next = addDays(focusDate, step);
    setFocusDate(next);
    if (
      next.getMonth() !== viewMonth.getMonth() ||
      next.getFullYear() !== viewMonth.getFullYear()
    ) {
      setViewMonth(firstOfMonth(next));
    }
    focusAfterRender.current = true;
  };

  useEffect(() => {
    if (!focusAfterRender.current) return;
    focusAfterRender.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-date="${toISODate(focusDate)}"]`,
      )
      ?.focus();
  }, [focusDate]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewMonth(firstOfMonth(viewMonth, -1))}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <p className="text-sm font-semibold text-foreground" aria-live="polite">
          {MONTH_LABEL.format(viewMonth)}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewMonth(firstOfMonth(viewMonth, 1))}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {weekdayHeaders.map((d) => (
          <span
            key={d}
            className="py-1 text-center text-2xs font-medium text-muted-foreground"
          >
            {d}
          </span>
        ))}
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-7 gap-y-1"
        onKeyDown={onKeyDown}
        onMouseLeave={() => onHoverDay?.(null)}
      >
        {days.map((day) => {
          const inCurrentMonth = day.getMonth() === viewMonth.getMonth();
          const isChosen =
            !!selection && day >= selection.start && day <= selection.end;
          const isEnd =
            !!selection &&
            (isSameDay(day, selection.start) || isSameDay(day, selection.end));
          const today = isToday(day, timezone);
          const isBeforeMin = !!minDate && day < minDate;

          return (
            <button
              type="button"
              key={day.toISOString()}
              data-date={toISODate(day)}
              tabIndex={isSameDay(day, tabStop) ? 0 : -1}
              aria-label={
                isChosen
                  ? `${formatLongDayLabel(day)}, ${selectionLabel}`
                  : formatLongDayLabel(day)
              }
              aria-current={today ? "date" : undefined}
              aria-disabled={isBeforeMin || undefined}
              autoFocus={!!autoFocusDate && isSameDay(day, autoFocusDate)}
              onClick={() => !isBeforeMin && onSelectDay(day)}
              onFocus={() => {
                setFocusDate(day);
                onHoverDay?.(day);
              }}
              onMouseEnter={() => onHoverDay?.(day)}
              className={`
                relative mx-auto h-8 w-8 rounded-md text-xs transition
                ${inCurrentMonth && !isBeforeMin ? "text-foreground" : "text-muted-foreground"}
                ${isBeforeMin ? "cursor-not-allowed opacity-50" : isChosen ? "bg-brand-muted" : "hover:bg-accent"}
                ${isEnd ? "font-semibold text-brand" : ""}
              `}
            >
              {day.getDate()}
              {today && (
                <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
