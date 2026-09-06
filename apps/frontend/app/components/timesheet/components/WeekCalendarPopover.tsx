"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  formatWeekdayLabel,
  getMonthGridDates,
  getWeekDates,
  getWeekStart,
  isSameDay,
  isToday,
} from "@/lib/utils/date";
import { useWorkSettings } from "@/hooks/useWorkSettings";

type Props = {
  weekStart: Date;
  onSelectWeek: (date: Date) => void;
  onClose: () => void;
};

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
export const WeekCalendarPopover = ({
  weekStart,
  onSelectWeek,
  onClose,
}: Props) => {
  const [viewMonth, setViewMonth] = useState(weekStart);
  const { weekStartDay, timezone } = useWorkSettings();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const weekEnd = addDays(weekStart, 6);
  const days = getMonthGridDates(viewMonth, weekStartDay);

  const weekdayHeaders = getWeekDates(
    getWeekStart(new Date(), weekStartDay),
  ).map(formatWeekdayLabel);

  return (
    <div
      ref={ref}
      className="absolute z-40 top-full mt-2 left-0 w-72 bg-popover rounded-2xl border border-border shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewMonth(addDays(viewMonth, -30))}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground transition"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold text-foreground">
          {MONTH_LABEL.format(viewMonth)}
        </p>
        <button
          type="button"
          onClick={() => setViewMonth(addDays(viewMonth, 30))}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {weekdayHeaders.map((d) => (
          <span
            key={d}
            className="text-[11px] font-medium text-muted-foreground text-center py-1"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const inCurrentMonth = day.getMonth() === viewMonth.getMonth();
          const inSelectedWeek = day >= weekStart && day <= weekEnd;
          const today = isToday(day, timezone);

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => {
                onSelectWeek(day);
                onClose();
              }}
              className={`
                relative h-8 text-xs rounded-md transition mx-auto w-8
                ${inCurrentMonth ? "text-foreground" : "text-muted-foreground/50"}
                ${inSelectedWeek ? "bg-brand-muted" : "hover:bg-muted/40"}
                ${isSameDay(day, weekStart) || isSameDay(day, weekEnd) ? "font-semibold text-brand" : ""}
              `}
            >
              {day.getDate()}
              {today && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-brand" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          onSelectWeek(new Date());
          onClose();
        }}
        className="w-full mt-3 pt-3 border-t border-border/60 text-xs font-medium text-brand hover:text-brand/80 transition"
      >
        Jump to this week
      </button>
    </div>
  );
};
