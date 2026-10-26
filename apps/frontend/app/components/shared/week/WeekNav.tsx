"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Undo2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";

/**
 * The way back to the current week or month from another one: a soft brand
 * tint, as tall as the controls beside it but the one in the brand colour.
 * On a phone it is the icon alone; the label stays for screen readers.
 */
export const BackToNowButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <Button
    variant="ghost"
    size="sm"
    className="w-auto bg-brand-subtle text-brand hover:bg-brand-muted hover:text-brand max-sm:size-10 max-sm:px-0"
    onClick={onClick}
  >
    <Undo2 className="size-3.5" aria-hidden />
    <span className="max-sm:sr-only">{label}</span>
  </Button>
);

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
          {/* A phone has no room for the year beside the week's controls. */}
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
