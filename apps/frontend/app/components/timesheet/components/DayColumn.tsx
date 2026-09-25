"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Lock } from "lucide-react";

import { Absence, PlanningEntry, TimeLog } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatDuration, isWeekend, toISODate } from "@/lib/utils/date";
import { ABSENCE_TYPE_LABELS } from "@/lib/utils/absence";
import { TimelogPopover } from "./TimelogPopover";
import { buildSegments } from "../helpers/build-segments";
import { TimelogSegment } from "./TimelogSegment";
import {
  ABSENCE_PATTERN,
  DAY_COLUMN_CLASS,
  OVERTIME_PATTERN,
  WEEKEND_PATTERN,
} from "../consts";
import { Badge } from "@/components/ui/badge";

type Props = {
  date: Date;
  timelogs: TimeLog[];
  plannedEntries: PlanningEntry[];
  absence?: Absence;
  isAbsenceLocked: boolean;
  totalMinutes: number;
  pixelsPerMinute: number;
  expectedMinutes: number;
  isLocked: boolean;
  isEditable: boolean;
  onAddClick: (date: Date) => void;
  onAbsenceClick: (date: Date) => void;
  onEntryClick: (timelog: TimeLog) => void;
};

export const DayColumn = ({
  date,
  timelogs,
  plannedEntries,
  absence,
  isAbsenceLocked,
  totalMinutes,
  pixelsPerMinute,
  expectedMinutes,
  isLocked,
  isEditable,
  onAddClick,
  onAbsenceClick,
  onEntryClick,
}: Props) => {
  const [hovered, setHovered] = useState<{
    timelog: TimeLog;
    anchor: DOMRect;
  } | null>(null);

  const weekend = isWeekend(date);
  const overTargetMinutes = Math.max(0, totalMinutes - expectedMinutes);
  const isOverTarget = overTargetMinutes > 0;

  const targetLineOffset = expectedMinutes * pixelsPerMinute;

  const segments = useMemo(
    () => buildSegments(timelogs, expectedMinutes, pixelsPerMinute),
    [timelogs, expectedMinutes, pixelsPerMinute],
  );

  const showPopover = (timelog: TimeLog, target: HTMLElement) =>
    setHovered({ timelog, anchor: target.getBoundingClientRect() });

  const hidePopover = () => setHovered(null);

  // Time cannot be logged on a day an absence covers, so the column opens the
  // absence instead.
  const openDay = () => {
    if (absence) {
      onAbsenceClick(date);
      return;
    }

    onAddClick(date);
  };

  return (
    <div
      role={isEditable ? "button" : undefined}
      tabIndex={isEditable ? 0 : undefined}
      aria-label={
        absence && isEditable
          ? `Edit the absence covering ${toISODate(date)}`
          : undefined
      }
      onClick={isEditable ? openDay : undefined}
      onKeyDown={(e) => {
        if (isEditable && (e.key === "Enter" || e.key === " ")) {
          openDay();
        }
      }}
      className={cn(
        DAY_COLUMN_CLASS,
        isEditable && "cursor-pointer hover:bg-muted/20",
        absence && ABSENCE_PATTERN,
        !absence && weekend && WEEKEND_PATTERN,
        !absence && !weekend && (isLocked ? "bg-muted/20" : "bg-card"),
      )}
    >
      {absence && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
          <Badge variant="default" dot className="text-[10px]">
            {ABSENCE_TYPE_LABELS[absence.type]}
          </Badge>

          {absence.note && (
            <span className="line-clamp-2 text-[11px] text-muted-foreground">
              {absence.note}
            </span>
          )}

          {isAbsenceLocked && !isLocked && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
              <Lock className="size-3" aria-hidden />
              Part of it is in a locked month
            </span>
          )}
        </div>
      )}

      {/* Once any time is logged, the record replaces the plan. */}
      {!absence && timelogs.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
          {plannedEntries.length > 0 && (
            <>
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <CalendarClock className="size-3" aria-hidden />
                Planned
              </span>

              {plannedEntries.map((entry) => (
                <span
                  key={entry.id}
                  className="max-w-full truncate text-xs text-muted-foreground"
                >
                  {entry.project.name} · {formatDuration(entry.plannedMinutes)}
                </span>
              ))}
            </>
          )}

          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
            {isLocked && (
              <>
                <Lock className="size-3" aria-hidden />
                Locked
              </>
            )}
            {isEditable && "Click to log time"}
          </span>
        </div>
      )}

      <div
        className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-border"
        style={{
          top: targetLineOffset,
        }}
      />

      {isOverTarget && (
        <>
          <div
            className={`pointer-events-none absolute left-0 right-0 ${OVERTIME_PATTERN}`}
            style={{
              top: targetLineOffset,
              height: overTargetMinutes * pixelsPerMinute,
            }}
          />

          <Badge
            variant="warning"
            className="absolute z-1 right-1.5 mt-1 px-1.5 py-0.5 text-[10px] font-semibold opacity-60 shadow-sm"
            style={{ top: targetLineOffset + 4 }}
          >
            +{formatDuration(overTargetMinutes)}
          </Badge>
        </>
      )}

      <div className="absolute inset-0">
        {segments.map((segment) => (
          <TimelogSegment
            key={segment.timelog.id}
            segment={segment}
            onClick={isEditable ? onEntryClick : undefined}
            onHover={showPopover}
            onLeave={hidePopover}
          />
        ))}
      </div>

      {hovered && (
        <TimelogPopover timelog={hovered.timelog} anchor={hovered.anchor} />
      )}
    </div>
  );
};
