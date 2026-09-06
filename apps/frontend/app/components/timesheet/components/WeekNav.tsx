"use client";

import { useState } from "react";
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
  const { weekStartDay } = useWorkSettings();

  const isCurrentWeek = isSameDay(
    weekStart,
    getWeekStart(new Date(), weekStartDay),
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-border overflow-hidden">
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
          className="rounded-none w-9 border-x border-border"
          onClick={() => onWeekChange(addWeeks(weekStart, 1))}
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setCalendarOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/30 transition"
        >
          <CalendarDays size={15} className="text-muted-foreground" />
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
          onClick={() => onWeekChange(new Date())}
        >
          Today
        </Button>
      )}
    </div>
  );
};
