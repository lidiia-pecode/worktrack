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
import { cn } from "@/lib/utils/cn";
import { dateFieldClassName } from "../inputs/DateRangePicker";

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
      <div className="flex items-center overflow-hidden rounded-md border border-control-border max-sm:rounded-lg">
        <Button
          variant="ghost"
          size="iconSm"
          className="w-9 rounded-none focus-visible:ring-inset max-sm:size-10"
          aria-label="Previous week"
          onClick={() => onWeekChange(addWeeks(weekStart, -1))}
        >
          <ChevronLeft size={16} aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          className="w-9 rounded-none border-0 border-l border-control-border focus-visible:ring-inset max-sm:size-10"
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
          className={cn(dateFieldClassName("sm"), "w-auto")}
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
