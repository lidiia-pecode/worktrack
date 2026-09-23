"use client";

import { Lock, Plus } from "lucide-react";

import { TimeLog } from "@/types";
import {
  formatDuration,
  formatWeekdayLabel,
  isWeekend,
  toISODate,
} from "@/lib/utils/date";

import { UserTimeEntryRow } from "./UserTimeEntryRow";

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

type UserTimeDayGroupProps = {
  date: Date;
  isToday: boolean;
  isLocked: boolean;
  timelogs: TimeLog[];
  onAdd?: (date: string) => void;
  onEdit?: (timelog: TimeLog) => void;
};

export const UserTimeDayGroup = ({
  date,
  isToday,
  isLocked,
  timelogs,
  onAdd,
  onEdit,
}: UserTimeDayGroupProps) => {
  const iso = toISODate(date);
  const totalMinutes = timelogs.reduce((sum, log) => sum + log.minutes, 0);

  return (
    <section
      className={`border-b border-border last:border-b-0 ${
        isWeekend(date) ? "bg-muted/20" : ""
      }`}
    >
      <header className="flex items-center justify-between gap-3 px-3 py-2">
        <h3 className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {formatWeekdayLabel(date)}
          </span>

          <span
            className={`text-xs font-semibold ${
              isToday ? "text-brand" : "text-foreground"
            }`}
          >
            {DAY_LABEL.format(date)}
          </span>

          {isLocked && (
            <Lock
              className="size-3 self-center text-muted-foreground"
              aria-label="Locked"
            />
          )}
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {totalMinutes > 0 ? formatDuration(totalMinutes) : "-"}
          </span>

          {onAdd && (
            <button
              type="button"
              onClick={() => onAdd(iso)}
              aria-label={`Log time on ${DAY_LABEL.format(date)}`}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </header>

      {timelogs.length > 0 && (
        <div className="space-y-0.5 px-1.5 pb-2">
          {timelogs.map((timelog) => (
            <UserTimeEntryRow
              key={timelog.id}
              timelog={timelog}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </section>
  );
};
