"use client";

import { useEffect, useRef } from "react";
import { addDays, companyToday } from "@/lib/utils/date";
import { useWorkSettings } from "@/hooks/useWorkSettings";

import { MonthCalendar } from "../MonthCalendar";

type Props = {
  weekStart: Date;
  onSelectWeek: (date: Date) => void;
  onClose: () => void;
};

export const WeekCalendarPopover = ({
  weekStart,
  onSelectWeek,
  onClose,
}: Props) => {
  const { timezone } = useWorkSettings();
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

  const selectWeek = (day: Date) => {
    onSelectWeek(day);
    onClose();
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choose a week"
      className="absolute z-40 top-full mt-2 left-0 w-72 bg-popover rounded-2xl border border-border shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150"
    >
      <MonthCalendar
        initialMonth={weekStart}
        selection={{ start: weekStart, end: addDays(weekStart, 6) }}
        selectionLabel="selected week"
        autoFocusDate={weekStart}
        onSelectDay={selectWeek}
      />

      <button
        type="button"
        onClick={() => selectWeek(companyToday(timezone))}
        className="w-full mt-3 pt-3 border-t border-border/60 text-xs font-medium text-brand hover:underline"
      >
        Jump to this week
      </button>
    </div>
  );
};
