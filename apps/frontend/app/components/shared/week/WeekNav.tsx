"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  addWeeks,
  companyToday,
  formatShortWeekRangeLabel,
  formatWeekRangeLabel,
  getWeekStart,
  isSameDay,
} from "@/lib/utils/date";
import { useWorkSettings } from "@/hooks/useWorkSettings";

import { WeekCalendarPopover } from "./WeekCalendarPopover";
import { BackToNowButton } from "../buttons/BackToNowButton";
import { Button } from "@/components/ui/button";

type BackToThisWeekProps = {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
};

export const BackToThisWeekButton = ({
  weekStart,
  onWeekChange,
}: BackToThisWeekProps) => {
  const { weekStartDay, timezone } = useWorkSettings();

  const isCurrentWeek = isSameDay(
    weekStart,
    getWeekStart(companyToday(timezone), weekStartDay),
  );

  if (isCurrentWeek) return null;

  return (
    <BackToNowButton
      label="Back to this week"
      onClick={() => onWeekChange(companyToday(timezone))}
    />
  );
};

export const WeekNav = ({ weekStart, onWeekChange }: BackToThisWeekProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarToggleRef = useRef<HTMLButtonElement>(null);

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
          className="rounded-none w-9 max-sm:size-10"
          aria-label="Previous week"
          onClick={() => onWeekChange(addWeeks(weekStart, -1))}
        >
          <ChevronLeft size={16} aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          className="rounded-none w-9 border-0 border-l border-border max-sm:size-10"
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition max-sm:h-10"
        >
          <CalendarDays
            size={15}
            className="text-muted-foreground max-sm:hidden"
            aria-hidden
          />
          <span className="max-sm:hidden">
            {formatWeekRangeLabel(weekStart)}
          </span>
          <span className="sm:hidden">
            {formatShortWeekRangeLabel(weekStart)}
          </span>
        </button>

        {calendarOpen && (
          <WeekCalendarPopover
            weekStart={weekStart}
            onSelectWeek={onWeekChange}
            onClose={closeCalendar}
          />
        )}
      </div>
    </div>
  );
};
