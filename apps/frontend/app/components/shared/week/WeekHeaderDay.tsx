import { Lock } from "lucide-react";

import {
  formatDuration,
  formatWeekdayLabel,
  isWeekend,
} from "@/lib/utils/date";

type WeekHeaderDayProps = {
  date: Date;
  isToday: boolean;
  /** One person's day only: the team grids leave it out. */
  totalMinutes?: number;
  targetMinutes?: number;
  isLocked?: boolean;
};

export const WeekHeaderDay = ({
  date,
  isToday: today,
  totalMinutes,
  targetMinutes,
  isLocked = false,
}: WeekHeaderDayProps) => {
  // A weekend expects nothing, so any time on it is over; a working day
  // expecting nothing, as at 0h, has no figure to go past.
  const hasTarget =
    targetMinutes !== undefined && (targetMinutes > 0 || isWeekend(date));
  const isOverTarget =
    hasTarget && totalMinutes !== undefined && totalMinutes > targetMinutes;

  return (
    <div
      className={`
        p-2 flex flex-col md:flex-row gap-2 justify-between
        border-r border-border/60 last:border-r-0
      `}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <p className="text-2xs uppercase tracking-wider text-muted-foreground">
          {formatWeekdayLabel(date)}
        </p>

        <p
          className={`
            text-xs font-semibold
            ${today ? "text-brand" : "text-foreground"}
          `}
        >
          {date.getDate()}
        </p>

        {isLocked && (
          <Lock
            className="size-3 self-center text-muted-foreground"
            aria-label="Locked"
          />
        )}
      </div>

      {totalMinutes !== undefined && (
        <p
          className={`
            text-xs font-medium
            ${isOverTarget ? "text-warning-text" : "text-muted-foreground"}
          `}
        >
          {totalMinutes > 0 ? formatDuration(totalMinutes) : "-"}
        </p>
      )}
    </div>
  );
};
