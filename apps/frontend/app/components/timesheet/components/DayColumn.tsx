"use client";

import { useMemo, useState } from "react";

import { TimeLog } from "@/types";
import { formatDuration, isWeekend } from "@/lib/utils/date";
import { TimelogPopover } from "./TimelogPopover";
import { buildSegments } from "../helpers/build-segments";
import { TimelogSegment } from "./TimelogSegment";
import { DAY_COLUMN_CLASS, OVERTIME_PATTERN, WEEKEND_PATTERN } from "../consts";
import { Badge } from "@/components/ui/badge";

type Props = {
  date: Date;
  timelogs: TimeLog[];
  totalMinutes: number;
  pixelsPerMinute: number;
  plannedMinutes: number;
  onAddClick: (date: Date) => void;
  onEntryClick: (timelog: TimeLog) => void;
};

export const DayColumn = ({
  date,
  timelogs,
  totalMinutes,
  pixelsPerMinute,
  plannedMinutes,
  onAddClick,
  onEntryClick,
}: Props) => {
  const [hovered, setHovered] = useState<{
    timelog: TimeLog;
    anchor: DOMRect;
  } | null>(null);

  const weekend = isWeekend(date);
  const overTargetMinutes = Math.max(0, totalMinutes - plannedMinutes);
  const isOverTarget = overTargetMinutes > 0;

  const targetLineOffset = plannedMinutes * pixelsPerMinute;

  const segments = useMemo(
    () => buildSegments(timelogs, plannedMinutes, pixelsPerMinute),
    [timelogs, plannedMinutes, pixelsPerMinute],
  );

  const showPopover = (timelog: TimeLog, target: HTMLElement) =>
    setHovered({ timelog, anchor: target.getBoundingClientRect() });

  const hidePopover = () => setHovered(null);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onAddClick(date)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onAddClick(date);
        }
      }}
      className={`
        ${DAY_COLUMN_CLASS}
        ${weekend ? WEEKEND_PATTERN : "bg-card"}
      `}
    >
      {timelogs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] text-muted-foreground/60">
            Click to log time
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
            onClick={onEntryClick}
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
