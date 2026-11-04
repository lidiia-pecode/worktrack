"use client";

import { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
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
import { StepArrows } from "../buttons/StepArrows";
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
      <StepArrows
        unit="week"
        onPrevious={() => onWeekChange(addWeeks(weekStart, -1))}
        onNext={() => onWeekChange(addWeeks(weekStart, 1))}
      />

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
