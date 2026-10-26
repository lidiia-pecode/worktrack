"use client";

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";

import { Absence, PlanningEntry, TimeLog } from "@/types";
import { cn } from "@/lib/utils/cn";
import {
  formatDuration,
  formatLongDayLabel,
  isWeekend,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_LABELS } from "@/lib/utils/absence";
import { TimelogPopover } from "./TimelogPopover";
import { stackSegments } from "../helpers/build-segments";
import { PlannedSegment } from "./PlannedSegment";
import { TimelogSegment } from "./TimelogSegment";
import {
  ABSENCE_PATTERN,
  DAY_COLUMN_CLASS,
  EXCESS_FILL,
  WEEKEND_EXTRA_PATTERN,
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
  /** The person's own expected minutes that day; undefined until it loads. */
  expectedMinutes?: number;
  isLocked: boolean;
  isEditable: boolean;
  /** False for a day that hasn't happened: its entries and absence still open. */
  canLogTime?: boolean;
  /** With a project when it comes from that project's plan. */
  onAddClick: (date: Date, projectId?: string) => void;
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
  canLogTime = true,
  onAddClick,
  onAbsenceClick,
  onEntryClick,
}: Props) => {
  const [hovered, setHovered] = useState<{
    timelogId: string;
    anchor: DOMRect;
  } | null>(null);

  const weekend = isWeekend(date);
  // A day that expects nothing, such as a weekend or an absence, has no line
  // and no excess fill (a weekend's time shows in its stripes instead); nothing
  // is over until the figure has loaded.
  const hasTargetLine = expectedMinutes !== undefined && expectedMinutes > 0;
  const overTargetFrom = hasTargetLine ? expectedMinutes : Infinity;
  const overTargetMinutes = Math.max(0, totalMinutes - overTargetFrom);
  const isOverTarget = overTargetMinutes > 0;

  const targetLineOffset = overTargetFrom * pixelsPerMinute;

  // Once any time is logged, the record replaces the plan.
  const showsPlan =
    !absence && timelogs.length === 0 && plannedEntries.length > 0;

  const segments = useMemo(
    () => stackSegments(timelogs, (log) => log.minutes, pixelsPerMinute),
    [timelogs, pixelsPerMinute],
  );
  const plannedSegments = useMemo(
    () =>
      showsPlan
        ? stackSegments(
            plannedEntries,
            (plan) => plan.plannedMinutes,
            pixelsPerMinute,
          )
        : [],
    [showsPlan, plannedEntries, pixelsPerMinute],
  );

  const showPopover = (timelog: TimeLog, target: HTMLElement) =>
    setHovered({
      timelogId: timelog.id,
      anchor: target.getBoundingClientRect(),
    });

  // Read from the current entries: a deleted entry's segment unmounts without
  // a mouse leave, so its card must not outlive it.
  const hoveredTimelog =
    hovered && timelogs.find((timelog) => timelog.id === hovered.timelogId);

  const hidePopover = () => setHovered(null);

  // Time cannot be logged on a day an absence covers, so the day opens the
  // absence instead; otherwise a new entry, where time can be logged.
  const opensDay = isEditable && (Boolean(absence) || canLogTime);

  const openDay = () => {
    if (absence) {
      onAbsenceClick(date);
      return;
    }

    onAddClick(date);
  };

  return (
    <div
      role={opensDay ? "button" : undefined}
      tabIndex={opensDay ? 0 : undefined}
      aria-label={
        opensDay
          ? absence
            ? `Edit the absence on ${formatLongDayLabel(date)}`
            : `Log time on ${formatLongDayLabel(date)}`
          : undefined
      }
      onClick={opensDay ? openDay : undefined}
      onKeyDown={(e) => {
        // Keys on a block inside the day belong to that block.
        if (e.target !== e.currentTarget) return;
        if (opensDay && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          openDay();
        }
      }}
      className={cn(
        DAY_COLUMN_CLASS,
        opensDay &&
          "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        opensDay && !absence && !weekend && "hover:bg-muted/10",
        absence && ABSENCE_PATTERN,
        // Time on a weekend is all extra, so its stripes turn amber.
        !absence &&
          weekend &&
          (totalMinutes > 0 ? WEEKEND_EXTRA_PATTERN : WEEKEND_PATTERN),
        !absence && !weekend && (isLocked ? "bg-muted/20" : "bg-card"),
      )}
    >
      {absence && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
          <Badge variant="default" dot className="text-2xs">
            {ABSENCE_TYPE_LABELS[absence.type]}
          </Badge>

          {absence.note && (
            <span className="line-clamp-2 text-2xs text-muted-foreground">
              {absence.note}
            </span>
          )}

          {isAbsenceLocked && !isLocked && (
            <span className="flex items-center gap-1 text-2xs text-muted-foreground">
              <Lock className="size-3" aria-hidden />
              Part of it is in a locked month
            </span>
          )}
        </div>
      )}

      {!absence && timelogs.length === 0 && !showsPlan && (
        <div className="absolute inset-0 flex items-center justify-center gap-1 px-2 text-center text-2xs text-muted-foreground">
          {isLocked && (
            <>
              <Lock className="size-3" aria-hidden />
              Locked
            </>
          )}
          {opensDay && "Click to log time"}
        </div>
      )}

      {hasTargetLine && (
        <div
          className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-border"
          style={{
            top: targetLineOffset,
          }}
        />
      )}

      {isOverTarget && (
        <>
          <div
            className={`pointer-events-none absolute left-0 right-0 ${EXCESS_FILL}`}
            // To the column's foot, as a weekend's stripes run.
            style={{ top: targetLineOffset, bottom: 0 }}
          />

          <Badge
            variant="warning"
            className="absolute z-1 right-1.5 mt-1 px-1.5 py-0.5 text-2xs font-semibold shadow-sm"
            style={{ top: targetLineOffset + 4 }}
          >
            +{formatDuration(overTargetMinutes)}
          </Badge>
        </>
      )}

      <div className="absolute inset-0">
        {plannedSegments.map((segment) => (
          <PlannedSegment
            key={segment.item.id}
            segment={segment}
            dayLabel={formatLongDayLabel(date)}
            onClick={
              opensDay ? (projectId) => onAddClick(date, projectId) : undefined
            }
          />
        ))}
        {segments.map((segment) => (
          <TimelogSegment
            key={segment.item.id}
            segment={segment}
            onClick={isEditable ? onEntryClick : undefined}
            onHover={showPopover}
            onLeave={hidePopover}
          />
        ))}
      </div>

      {hovered && hoveredTimelog && (
        <TimelogPopover timelog={hoveredTimelog} anchor={hovered.anchor} />
      )}
    </div>
  );
};
