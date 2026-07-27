"use client";

import { useMemo, useState } from "react";

import { Timelog } from "@/types";
import { formatDuration } from "@/lib/date";
import { TimelogPopover } from "./TimelogPopover";
import { buildSegments } from "../helpers/build-segments";
import { TimelogSegment } from "./TimelogSegment";
import { DAY_COLUMN_CLASS, OVERTIME_PATTERN, WEEKEND_PATTERN } from "../consts";

type Props = {
  date: Date;
  timelogs: Timelog[];
  totalMinutes: number;
  pixelsPerMinute: number;
  plannedMinutes: number;
  onAddClick: (date: Date) => void;
  onEntryClick: (timelog: Timelog) => void;
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
    timelog: Timelog;
    anchor: DOMRect;
  } | null>(null);

  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const overTargetMinutes = Math.max(0, totalMinutes - plannedMinutes);
  const isOverTarget = overTargetMinutes > 0;

  const targetLineOffset = plannedMinutes * pixelsPerMinute;

  const segments = useMemo(
    () => buildSegments(timelogs, plannedMinutes, pixelsPerMinute),
    [timelogs, plannedMinutes, pixelsPerMinute],
  );

  const showPopover = (timelog: Timelog, target: HTMLElement) =>
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
        ${weekend ? WEEKEND_PATTERN : "bg-white"}
      `}
    >
      {timelogs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] text-zinc-300">Click to log time</span>
        </div>
      )}

      {/* dashed (overtime) line*/}
      <div
        className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-zinc-300"
        style={{
          top: targetLineOffset,
        }}
      />

      {isOverTarget && (
        <>
          {/* overtime stripes pattern */}
          <div
            className={`pointer-events-none absolute left-0 right-0 ${OVERTIME_PATTERN}`}
            style={{
              top: targetLineOffset,
              height: overTargetMinutes * pixelsPerMinute,
            }}
          />

          <div
            className="absolute z-1 opacity-60 right-1.5 mt-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 shadow-sm"
            style={{ top: targetLineOffset + 4 }}
          >
            +{formatDuration(overTargetMinutes)}
          </div>
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
