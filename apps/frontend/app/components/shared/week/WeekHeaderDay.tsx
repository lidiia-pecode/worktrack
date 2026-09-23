import { Lock } from "lucide-react";

import {
  formatDuration,
  formatWeekdayLabel,
  isWeekend,
} from "@/lib/utils/date";

type WeekHeaderDayProps = {
  date: Date;
  isToday: boolean;
  totalMinutes: number;
  targetMinutes?: number;
  isLocked?: boolean;
};

export function WeekHeaderDay({
  date,
  isToday: today,
  totalMinutes,
  targetMinutes,
  isLocked = false,
}: WeekHeaderDayProps) {
  const weekend = isWeekend(date);
  const isOverTarget =
    targetMinutes !== undefined && totalMinutes > targetMinutes;

  return (
    <div
      className={`
        p-2 flex flex-col md:flex-row gap-2 justify-between
        border-r border-border/60 last:border-r-0
        ${weekend ? "bg-muted/20" : ""}
      `}
    >
      <div className="flex gap-2 items-baseline">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
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

      <p
        className={`
          text-xs font-medium
          ${isOverTarget ? "text-warning" : "text-muted-foreground"}
        `}
      >
        {totalMinutes > 0 ? formatDuration(totalMinutes) : "-"}
      </p>
    </div>
  );
}
