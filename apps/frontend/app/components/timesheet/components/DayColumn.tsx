"use client";

import { useMemo, useState } from "react";
import { Lock, Plus } from "lucide-react";

import { Absence, PlanningEntry, TimeLog } from "@/types";
import { cn } from "@/lib/utils/cn";
import {
  formatDuration,
  formatLongDayLabel,
  isWeekend,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_LABELS } from "@/lib/utils/absence";
import { TimelogPopover } from "./TimelogPopover";
import {
  SEGMENT_GAP_PX,
  STACK_TOP_INSET_PX,
  offsetAtMinutes,
  stackSegments,
} from "../helpers/build-segments";
import { dayFill } from "../helpers/day-fill";
import { PlannedSegment } from "./PlannedSegment";
import { TimelogSegment } from "./TimelogSegment";
import { DAY_COLUMN_CLASS, EXCESS_FILL } from "../consts";
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

const minutesOfLog = (log: TimeLog) => log.minutes;

const ABSENCE_CONTENT_CLASS =
  "absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center";

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
    anchor: HTMLElement;
  } | null>(null);

  const weekend = isWeekend(date);
  // A day that expects nothing (a weekend, an absence) has no line or excess
  // fill; nothing is over until the figure has loaded.
  const hasTargetLine = expectedMinutes !== undefined && expectedMinutes > 0;
  const overTargetFrom = hasTargetLine ? expectedMinutes : Infinity;
  const overTargetMinutes = Math.max(0, totalMinutes - overTargetFrom);
  const isOverTarget = overTargetMinutes > 0;

  // Once any time is logged, the record replaces the plan.
  const showsPlan =
    !absence && timelogs.length === 0 && plannedEntries.length > 0;

  const segments = useMemo(
    () => stackSegments(timelogs, minutesOfLog, pixelsPerMinute),
    [timelogs, pixelsPerMinute],
  );

  const targetLineOffset = hasTargetLine
    ? offsetAtMinutes(segments, minutesOfLog, expectedMinutes, pixelsPerMinute)
    : 0;
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
    setHovered({ timelogId: timelog.id, anchor: target });

  // Read from the current entries: a deleted entry's segment unmounts without
  // a mouse leave, so its card must not outlive it.
  const hoveredTimelog =
    hovered && timelogs.find((timelog) => timelog.id === hovered.timelogId);

  const hidePopover = () => setHovered(null);

  const dayLabel = formatLongDayLabel(date);
  // A day an absence covers opens the absence instead of a new entry, to read
  // once it is locked.
  const opensAbsence = !!absence && (isEditable || isAbsenceLocked);
  const canAddEntry = !absence && isEditable && canLogTime;
  const isEmpty = timelogs.length === 0 && !showsPlan;

  // The part of the day below its entries, or its plans, logs a new entry.
  const lastBlock = (showsPlan ? plannedSegments : segments).at(-1);
  const freeFromPx = lastBlock
    ? lastBlock.offsetTop + lastBlock.height + SEGMENT_GAP_PX
    : STACK_TOP_INSET_PX;

  const absenceContent = absence && (
    <>
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
    </>
  );

  return (
    <div
      className={cn(
        DAY_COLUMN_CLASS,
        // A working day's excess is drawn on the grid's scale below, so the
        // column itself takes no figure.
        dayFill({
          isAbsent: Boolean(absence),
          isWeekend: weekend,
          minutes: totalMinutes,
        }) ?? (isLocked ? "bg-muted/20" : "bg-card"),
      )}
    >
      {absence &&
        (opensAbsence ? (
          <button
            type="button"
            onClick={() => onAbsenceClick(date)}
            className={cn(
              ABSENCE_CONTENT_CLASS,
              "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
            )}
          >
            <span className="sr-only">
              {isEditable ? "Edit" : "View"} the absence on {dayLabel}:
            </span>
            {absenceContent}
          </button>
        ) : (
          <div className={ABSENCE_CONTENT_CLASS}>{absenceContent}</div>
        ))}

      {!absence && isEmpty && isLocked && (
        <div className="absolute inset-0 flex items-center justify-center gap-1 px-2 text-center text-2xs text-muted-foreground">
          <Lock className="size-3" aria-hidden />
          Locked
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
            style={{ top: targetLineOffset, bottom: 0 }}
          />

          <Badge
            variant="warning"
            className="pointer-events-none absolute z-1 right-1.5 mt-1 px-1.5 py-0.5 text-2xs font-semibold shadow-sm"
            style={{ top: targetLineOffset + 4 }}
          >
            +{formatDuration(overTargetMinutes)}
          </Badge>
        </>
      )}

      {/* Only the blocks take the pointer, so the absence below stays reachable. */}
      <div className="pointer-events-none absolute inset-0 *:pointer-events-auto">
        {plannedSegments.map((segment) => (
          <PlannedSegment
            key={segment.item.id}
            segment={segment}
            dayLabel={dayLabel}
            onClick={
              canAddEntry
                ? (projectId) => onAddClick(date, projectId)
                : undefined
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

      {canAddEntry && (
        <button
          type="button"
          aria-label={`Log time on ${dayLabel}`}
          onClick={() => onAddClick(date)}
          style={{ top: freeFromPx }}
          className="group absolute right-[3px] bottom-[3px] left-[3px] flex cursor-pointer items-center justify-center rounded-md text-2xs text-muted-foreground transition-colors hover:bg-brand/8 hover:text-brand focus-visible:bg-brand/8 focus-visible:text-brand focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          {isEmpty ? (
            "Click to log time"
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Plus className="size-3.5" aria-hidden />
              Log time
            </span>
          )}
        </button>
      )}

      {hovered && hoveredTimelog && (
        <TimelogPopover timelog={hoveredTimelog} anchor={hovered.anchor} />
      )}
    </div>
  );
};
