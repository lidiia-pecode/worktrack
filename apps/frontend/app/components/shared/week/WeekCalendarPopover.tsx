"use client";

import { useState } from "react";
import { addDays, companyToday, getWeekStart } from "@/lib/utils/date";
import { useWorkSettings } from "@/hooks/useWorkSettings";

import { MonthCalendar } from "../MonthCalendar";

type Props = {
  weekStart: Date;
  onSelectWeek: (date: Date) => void;
  onClose: () => void;
};

/** The calendar a week is chosen from: the week under the pointer is the one a click picks. */
export const WeekCalendarPopover = ({
  weekStart,
  onSelectWeek,
  onClose,
}: Props) => {
  const { timezone, weekStartDay } = useWorkSettings();
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const shownWeekStart = hoveredDay
    ? getWeekStart(hoveredDay, weekStartDay)
    : weekStart;

  const selectWeek = (day: Date) => {
    onSelectWeek(day);
    onClose();
  };

  return (
    <>
      <MonthCalendar
        initialMonth={weekStart}
        selection={{ start: shownWeekStart, end: addDays(shownWeekStart, 6) }}
        selectionLabel="selected week"
        autoFocusDate={weekStart}
        onSelectDay={selectWeek}
        onHoverDay={setHoveredDay}
      />

      <button
        type="button"
        onClick={() => selectWeek(companyToday(timezone))}
        className="mt-3 w-full border-t border-border/60 pt-3 text-xs font-medium text-brand hover:underline"
      >
        Back to this week
      </button>
    </>
  );
};
