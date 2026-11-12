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

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { calendarTabStop } from "../MonthCalendar";
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
  const calendarRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex items-center gap-2">
      <StepArrows
        unit="week"
        onPrevious={() => onWeekChange(addWeeks(weekStart, -1))}
        onNext={() => onWeekChange(addWeeks(weekStart, 1))}
      />

      {/* On the shared popover, so it fits a phone's screen, flips when
          there's no room below and returns focus to its button. */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger className={cn(dateFieldClassName("sm"), "w-auto")}>
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
        </PopoverTrigger>

        <PopoverContent
          aria-label="Choose a week"
          className="w-72"
          initialFocus={() => calendarTabStop(calendarRef.current)}
        >
          <div ref={calendarRef}>
            <WeekCalendarPopover
              weekStart={weekStart}
              onSelectWeek={onWeekChange}
              onClose={() => setCalendarOpen(false)}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
