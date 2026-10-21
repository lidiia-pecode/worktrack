"use client";

import { CalendarClock, Lock, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Absence, PlanningEntry, TimeLog } from "@/types";
import { ABSENCE_TYPE_LABELS, formatAbsenceRange } from "@/lib/utils/absence";
import { cn } from "@/lib/utils/cn";
import {
  formatDuration,
  formatWeekdayLabel,
  isWeekend,
  toISODate,
} from "@/lib/utils/date";

import { ABSENCE_PATTERN, WEEKEND_FILL } from "../../timesheet/consts";
import { UserTimeEntryRow } from "./UserTimeEntryRow";

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

const absenceSummary = (absence: Absence) => (
  <>
    <Badge variant="default" dot className="text-2xs">
      {ABSENCE_TYPE_LABELS[absence.type]}
    </Badge>

    <span>{formatAbsenceRange(absence)}</span>
  </>
);

type UserTimeDayGroupProps = {
  date: Date;
  isToday: boolean;
  isLocked: boolean;
  timelogs: TimeLog[];
  absence?: Absence;
  /** Part of the absence is in a locked month, so it is shown but not opened. */
  isAbsenceLocked?: boolean;
  /** Shown where nothing is logged and no absence covers the day. */
  plannedEntries?: PlanningEntry[];
  onAdd?: (date: string) => void;
  onEdit?: (timelog: TimeLog) => void;
  onAbsenceClick?: (absence: Absence) => void;
};

export const UserTimeDayGroup = ({
  date,
  isToday,
  isLocked,
  timelogs,
  absence,
  isAbsenceLocked = false,
  plannedEntries = [],
  onAdd,
  onEdit,
  onAbsenceClick,
}: UserTimeDayGroupProps) => {
  const iso = toISODate(date);
  const totalMinutes = timelogs.reduce((sum, log) => sum + log.minutes, 0);
  const showsPlan =
    !absence && timelogs.length === 0 && plannedEntries.length > 0;

  return (
    <section
      className={cn(
        "border-b border-border last:border-b-0",
        absence && ABSENCE_PATTERN,
        !absence && isWeekend(date) && WEEKEND_FILL,
      )}
    >
      <header className="flex items-center justify-between gap-3 px-3 py-2">
        <h3 className="flex items-baseline gap-2">
          <span className="text-2xs uppercase tracking-wider text-muted-foreground">
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
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </header>

      {absence && (
        <div className="px-1.5 pb-2">
          {onAbsenceClick && !isAbsenceLocked ? (
            <button
              type="button"
              onClick={() => onAbsenceClick(absence)}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {absenceSummary(absence)}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 px-1.5 py-1 text-xs text-muted-foreground">
              {absenceSummary(absence)}

              {isAbsenceLocked && !isLocked && (
                <span className="flex items-center gap-1 text-2xs">
                  <Lock className="size-3" aria-hidden />
                  Part of it is in a locked month
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {showsPlan && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pb-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-2xs uppercase tracking-wider">
            <CalendarClock className="size-3" aria-hidden />
            Planned
          </span>

          {plannedEntries.map((entry) => (
            <span key={entry.id}>
              {entry.project.name} · {formatDuration(entry.plannedMinutes)}
            </span>
          ))}
        </div>
      )}

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
