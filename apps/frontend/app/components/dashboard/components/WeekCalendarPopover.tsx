"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  getMonthGridDates,
  getWeekStart,
  isSameDay,
  isToday,
} from "@/lib/week";

type Props = {
  weekStart: Date;
  onSelectWeek: (weekStart: Date) => void;
  onClose: () => void;
};

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const WEEKDAY_HEADER = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const WeekCalendarPopover = ({
  weekStart,
  onSelectWeek,
  onClose,
}: Props) => {
  const [viewMonth, setViewMonth] = useState(weekStart);
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
  const days = getMonthGridDates(viewMonth);

  return (
    <div
      ref={ref}
      className="absolute z-40 top-full mt-2 left-0 w-72 bg-white rounded-2xl border border-zinc-200 shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewMonth(addDays(viewMonth, -30))}
          className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold text-zinc-800">
          {MONTH_LABEL.format(viewMonth)}
        </p>
        <button
          type="button"
          onClick={() => setViewMonth(addDays(viewMonth, 30))}
          className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_HEADER.map((d) => (
          <span
            key={d}
            className="text-[11px] font-medium text-zinc-400 text-center py-1"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const inCurrentMonth = day.getMonth() === viewMonth.getMonth();
          const inSelectedWeek = day >= weekStart && day <= weekEnd;
          const today = isToday(day);

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => {
                onSelectWeek(getWeekStart(day));
                onClose();
              }}
              className={`
                relative h-8 text-xs rounded-md transition mx-auto w-8
                ${inCurrentMonth ? "text-zinc-700" : "text-zinc-300"}
                ${inSelectedWeek ? "bg-blue-50" : "hover:bg-zinc-100"}
                ${isSameDay(day, weekStart) || isSameDay(day, weekEnd) ? "font-semibold text-blue-600" : ""}
              `}
            >
              {day.getDate()}
              {today && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          onSelectWeek(getWeekStart(new Date()));
          onClose();
        }}
        className="w-full mt-3 pt-3 border-t border-zinc-100 text-xs font-medium text-blue-600 hover:text-blue-700 transition"
      >
        Jump to this week
      </button>
    </div>
  );
};
