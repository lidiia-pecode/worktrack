import { ReactNode } from "react";
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
  /** At the heading's end, such as Team time's control for the weekend. */
  action?: ReactNode;
};

export const WeekHeaderDay = ({
  date,
  isToday: today,
  totalMinutes,
  targetMinutes,
  isLocked = false,
  action,
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
        p-2 flex flex-col md:flex-row md:flex-wrap gap-x-1 gap-y-2 md:gap-y-0.5 justify-between
        border-r border-border/60 last:border-r-0
      `}
    >
      {/* The day and its date never part; a lock or an action wraps below
          them in a narrow column. */}
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="flex items-baseline gap-2 whitespace-nowrap">
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
        </span>

        {isLocked && (
          <Lock
            className="size-3 self-center text-muted-foreground"
            aria-label="Locked"
          />
        )}
      </div>

      {action}

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
