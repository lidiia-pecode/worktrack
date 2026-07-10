"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { addWeeks, formatWeekRangeLabel, getWeekStart, isSameDay } from "@/lib/week";
import Button from "../ui/Button";
import { WeekCalendarPopover } from "./WeekCalendarPopover";

type Props = {
  weekStart: Date;
  onWeekChange: (weekStart: Date) => void;
};

export const WeekNav = ({ weekStart, onWeekChange }: Props) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isCurrentWeek = isSameDay(weekStart, getWeekStart(new Date()));

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-zinc-200 overflow-hidden">
        <Button
          variant="ghost"
          size="iconSm"
          className="rounded-none w-9"
          onClick={() => onWeekChange(addWeeks(weekStart, -1))}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          className="rounded-none w-9 border-x border-zinc-200"
          onClick={() => onWeekChange(addWeeks(weekStart, 1))}
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setCalendarOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition"
        >
          <CalendarDays size={15} className="text-zinc-400" />
          {formatWeekRangeLabel(weekStart)}
        </button>

        {calendarOpen && (
          <WeekCalendarPopover
            weekStart={weekStart}
            onSelectWeek={onWeekChange}
            onClose={() => setCalendarOpen(false)}
          />
        )}
      </div>

      {!isCurrentWeek && (
        <Button
          variant="secondary"
          size="sm"
          className="w-auto"
          onClick={() => onWeekChange(getWeekStart(new Date()))}
        >
          Today
        </Button>
      )}
    </div>
  );
};
