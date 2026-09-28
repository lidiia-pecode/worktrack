"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  addWeeks,
  formatWeekRangeLabel,
  getWeekStart,
  isSameDay,
} from "@/lib/utils/date";
import { useWorkSettings } from "@/hooks/useWorkSettings";

import { WeekCalendarPopover } from "./WeekCalendarPopover";
import { Button } from "@/components/ui/button";

type Props = {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
};

export const WeekNav = ({ weekStart, onWeekChange }: Props) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarToggleRef = useRef<HTMLButtonElement>(null);
  const { weekStartDay } = useWorkSettings();

  const isCurrentWeek = isSameDay(
    weekStart,
    getWeekStart(new Date(), weekStartDay),
  );

  const closeCalendar = () => {
    setCalendarOpen(false);
    calendarToggleRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-border overflow-hidden">
        <Button
          variant="ghost"
          size="iconSm"
          className="rounded-none w-9"
          aria-label="Previous week"
          onClick={() => onWeekChange(addWeeks(weekStart, -1))}
        >
          <ChevronLeft size={16} aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          className="rounded-none w-9 border-x border-border"
          aria-label="Next week"
          onClick={() => onWeekChange(addWeeks(weekStart, 1))}
        >
          <ChevronRight size={16} aria-hidden />
        </Button>
      </div>

      <div className="relative">
        <button
          ref={calendarToggleRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={calendarOpen}
          onClick={() => setCalendarOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/30 transition"
        >
          <CalendarDays
            size={15}
            className="text-muted-foreground"
            aria-hidden
          />
          {formatWeekRangeLabel(weekStart)}
        </button>

        {calendarOpen && (
          <WeekCalendarPopover
            weekStart={weekStart}
            onSelectWeek={onWeekChange}
            onClose={closeCalendar}
          />
        )}
      </div>

      {!isCurrentWeek && (
        <Button
          variant="secondary"
          size="sm"
          className="w-auto"
          onClick={() => onWeekChange(new Date())}
        >
          Today
        </Button>
      )}
    </div>
  );
};
