"use client";

import { useMemo, useState } from "react";
import { CalendarOff, Lock, Plus } from "lucide-react";

import { Absence, PlanningEntry, TimeLog } from "@/types";
import { cn } from "@/lib/utils/cn";
import {
  formatDuration,
  formatLongDayLabel,
  isWeekend,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_LABELS, isPartDayAbsence } from "@/lib/utils/absence";
import { TimelogPopover } from "../../shared/time-entry/TimelogPopover";
import {
  STACK_TOP_INSET_PX,
  offsetAtMinutes,
  partAbsenceHeight,
  stackSegments,
} from "../helpers/build-segments";
import { dayFill } from "../../shared/week/day-fill";
import { dayActions } from "../helpers/day-state";
import { PlannedSegment } from "./PlannedSegment";
import { TimelogSegment } from "./TimelogSegment";
import {
  ABSENCE_PATTERN,
  DAY_COLUMN_CLASS,
  EXCESS_FILL,
} from "../../shared/week/day-styles";
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
  /** A working day still to come, taken off from the day itself. */
  onAddAbsenceClick: (date: Date) => void;
  onEntryClick: (timelog: TimeLog) => void;
};

const minutesOfLog = (log: TimeLog) => log.minutes;

const ABSENCE_CONTENT_CLASS =
  "absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center";

/** Part of a day away: a block at the top of the day, its hours tall. */
const PART_ABSENCE_CLASS = cn(
  "absolute top-[3px] right-[3px] left-[3px] z-10 flex flex-col items-center justify-center gap-1 overflow-hidden rounded-md border-b border-card px-2 text-center ring-1 ring-foreground/5",
  ABSENCE_PATTERN,
);

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
  onAddAbsenceClick,
  onEntryClick,
}: Props) => {
  const [hovered, setHovered] = useState<{
    timelogId: string;
    anchor: HTMLElement;
  } | null>(null);

  const weekend = isWeekend(date);
  // Part of a day away sits at the top of the day, as tall as its hours, so
  // the time below it reaches the line where a full day's does.
  const partAbsence =
    absence && isPartDayAbsence(absence) ? absence : undefined;
  const wholeAbsence = partAbsence ? undefined : absence;
  const partAbsencePx = partAbsenceHeight(partAbsence, pixelsPerMinute);
  // A day that expects nothing (a weekend, an absence) has no line or excess
  // fill; nothing is over until the figure has loaded.
  const hasTargetLine = expectedMinutes !== undefined && expectedMinutes > 0;
  const overTargetFrom = hasTargetLine ? expectedMinutes : Infinity;
  const overTargetMinutes = Math.max(0, totalMinutes - overTargetFrom);
  const isOverTarget = overTargetMinutes > 0;

  const { opensAbsence, canAddEntry, canAddAbsence, showsPlan } = dayActions({
    date,
    absence,
    isAbsenceLocked,
    isEditable,
    canLogTime,
    timelogs,
    plannedEntries,
  });

  const segments = useMemo(
    () => stackSegments(timelogs, minutesOfLog, pixelsPerMinute, partAbsencePx),
    [timelogs, pixelsPerMinute, partAbsencePx],
  );

  const targetLineOffset = hasTargetLine
    ? offsetAtMinutes(
        segments,
        minutesOfLog,
        expectedMinutes,
        pixelsPerMinute,
        partAbsencePx,
      )
    : 0;
  const plannedSegments = useMemo(
    () =>
      showsPlan
        ? stackSegments(
            plannedEntries,
            (plan) => plan.plannedMinutes,
            pixelsPerMinute,
            partAbsencePx,
          )
        : [],
    [showsPlan, plannedEntries, pixelsPerMinute, partAbsencePx],
  );

  const showPopover = (timelog: TimeLog, target: HTMLElement) =>
    setHovered({ timelogId: timelog.id, anchor: target });

  // Read from the current entries: a deleted entry's segment unmounts without
  // a mouse leave, so its card must not outlive it.
  const hoveredTimelog =
    hovered && timelogs.find((timelog) => timelog.id === hovered.timelogId);

  const hidePopover = () => setHovered(null);

  const dayLabel = formatLongDayLabel(date);
  const isEmpty = timelogs.length === 0 && !showsPlan;

  // The part of the day below its entries, or its plans, logs a new entry.
  const lastBlock = (showsPlan ? plannedSegments : segments).at(-1);
  const freeFromPx = lastBlock
    ? lastBlock.offsetTop + lastBlock.height
    : STACK_TOP_INSET_PX + partAbsencePx;

  const absenceContent = absence && (
    <>
      <Badge variant="default" dot className="text-2xs">
        {ABSENCE_TYPE_LABELS[absence.type]}
        {partAbsence && ` · ${formatDuration(partAbsence.minutes)}`}
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
          isAbsent: Boolean(wholeAbsence),
          isWeekend: weekend,
          minutes: totalMinutes,
        }) ?? (isLocked ? "bg-day-locked" : "bg-card"),
      )}
    >
      {absence &&
        (opensAbsence ? (
          <button
            type="button"
            onClick={() => onAbsenceClick(date)}
            className={cn(
              partAbsence ? PART_ABSENCE_CLASS : ABSENCE_CONTENT_CLASS,
              "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
            )}
            style={partAbsence && { height: partAbsencePx }}
          >
            <span className="sr-only">
              {isEditable ? "Edit" : "View"} the absence on {dayLabel}:
            </span>
            {absenceContent}
          </button>
        ) : (
          <div
            className={partAbsence ? PART_ABSENCE_CLASS : ABSENCE_CONTENT_CLASS}
            style={partAbsence && { height: partAbsencePx }}
          >
            {absenceContent}
          </div>
        ))}

      {!absence && isEmpty && isLocked && (
        <div className="absolute inset-0 flex items-center justify-center gap-1 px-2 text-center text-2xs text-muted-foreground">
          <Lock className="size-3" aria-hidden />
          Locked
        </div>
      )}

      {hasTargetLine && (
        // Over the blocks, not behind them: on a full day the figure's line
        // would otherwise be hidden by the entry that reaches it.
        <div
          className="pointer-events-none absolute right-0 left-0 z-10 border-t border-dashed border-muted-foreground/35"
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
            className="pointer-events-none absolute right-1.5 z-20 mt-1 px-1.5 py-0.5 text-2xs font-semibold shadow-sm"
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

      {canAddAbsence && (
        <button
          type="button"
          aria-label={`Add an absence on ${dayLabel}`}
          onClick={() => onAddAbsenceClick(date)}
          style={{ top: freeFromPx }}
          className="group absolute right-[3px] bottom-[3px] left-[3px] flex cursor-pointer items-center justify-center rounded-md text-2xs text-muted-foreground transition-colors hover:bg-hover hover:text-brand focus-visible:bg-hover focus-visible:text-brand focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex items-center gap-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <CalendarOff className="size-3.5" aria-hidden />
            Add absence
          </span>
        </button>
      )}

      {canAddEntry && (
        <button
          type="button"
          aria-label={`Log time on ${dayLabel}`}
          onClick={() => onAddClick(date)}
          style={{ top: freeFromPx }}
          className="group absolute right-[3px] bottom-[3px] left-[3px] flex cursor-pointer items-center justify-center rounded-md text-2xs text-muted-foreground transition-colors hover:bg-hover hover:text-brand focus-visible:bg-hover focus-visible:text-brand focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
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
