"use client";

import { useState } from "react";

import { Timelog } from "@/types";
import { DAILY_TARGET_MINUTES } from "@/lib/consts";
import { getProjectColor } from "@/lib/projectColors";
import { formatDuration } from "@/lib/date";
import { TimelogPopover } from "./Timelogpopover";

type Props = {
  date: Date;
  timelogs: Timelog[];
  /** Total minutes logged this day — lifted up so it's computed once per day, not per column. */
  totalMinutes: number;
  /** Pixels representing one minute of logged time, shared across the whole week grid. */
  pixelsPerMinute: number;
  onAddClick: (date: Date) => void;
  onEntryClick: (timelog: Timelog) => void;
};

const MIN_SEGMENT_HEIGHT = 6;
const TWO_LINE_LABEL_THRESHOLD = 34;
const ONE_LINE_LABEL_THRESHOLD = 18;

export const DayColumn = ({
  date,
  timelogs,
  totalMinutes,
  pixelsPerMinute,
  onAddClick,
  onEntryClick,
}: Props) => {
  const [hovered, setHovered] = useState<{
    timelog: Timelog;
    anchor: DOMRect;
  } | null>(null);

  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const overTargetMinutes = Math.max(0, totalMinutes - DAILY_TARGET_MINUTES);
  const isOverTarget = overTargetMinutes > 0;
  const targetLineOffset = DAILY_TARGET_MINUTES * pixelsPerMinute;

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
        relative
        h-full
        border-r
        border-zinc-200
        last:border-r-0
        overflow-hidden
        cursor-pointer
        transition-colors

        ${
          weekend
            ? "bg-[repeating-linear-gradient(-45deg,#fafafa,#fafafa_8px,#f4f4f5_8px,#f4f4f5_16px)]"
            : "bg-white"
        }

        hover:bg-zinc-50
      `}
    >
      {timelogs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] text-zinc-300">Click to log time</span>
        </div>
      )}

      {isOverTarget && (
        <>
          {/* Highlight the slice of the column above the 8h target line. */}
          <div
            className="pointer-events-none absolute left-0 right-0 bg-[repeating-linear-gradient(-45deg,#fff7ed,#fff7ed_6px,#ffedd5_6px,#ffedd5_12px)]"
            style={{
              bottom: targetLineOffset,
              height: overTargetMinutes * pixelsPerMinute,
            }}
          />

          <div
            className="absolute right-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm"
            style={{ bottom: targetLineOffset + 4 }}
          >
            +{formatDuration(overTargetMinutes)}
          </div>
        </>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex flex-col-reverse gap-[3px] px-[3px] pb-[3px]">
        {timelogs.map((log) => {
          const color = getProjectColor(log.projectActivity.project.id);
          const heightPx = Math.max(
            log.time * pixelsPerMinute,
            MIN_SEGMENT_HEIGHT,
          );

          return (
            <div
              key={log.id}
              role="button"
              tabIndex={0}
              aria-label={`${formatDuration(log.time)} — ${log.projectActivity.project.name} / ${log.projectActivity.activity.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onEntryClick(log);
              }}
              onMouseEnter={(e) => showPopover(log, e.currentTarget)}
              onMouseLeave={hidePopover}
              onFocus={(e) => showPopover(log, e.currentTarget)}
              onBlur={hidePopover}
              style={{ height: heightPx, backgroundColor: color.bg }}
              className="
                relative
                w-full
                shrink-0
                rounded-md
                ring-1
                ring-black/5
                overflow-hidden
                hover:ring-black/15
                hover:brightness-105
                transition-all
              "
            >
              {heightPx >= TWO_LINE_LABEL_THRESHOLD ? (
                <div className="pointer-events-none flex h-full flex-col justify-center px-2 py-1">
                  <span className="truncate text-[11px] font-semibold leading-tight text-zinc-900/80">
                    {formatDuration(log.time)}
                  </span>
                  <span className="truncate text-[10px] leading-tight text-zinc-900/60">
                    {log.projectActivity.project.name} ·{" "}
                    {log.projectActivity.activity.name}
                  </span>
                </div>
              ) : heightPx >= ONE_LINE_LABEL_THRESHOLD ? (
                <div className="pointer-events-none flex h-full items-center px-2">
                  <span className="truncate text-[10px] font-medium text-zinc-900/70">
                    {formatDuration(log.time)}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {hovered && (
        <TimelogPopover timelog={hovered.timelog} anchor={hovered.anchor} />
      )}
    </div>
  );
};
