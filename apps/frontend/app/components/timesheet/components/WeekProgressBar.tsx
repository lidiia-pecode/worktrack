"use client";

import { useMemo } from "react";
import { formatDuration } from "@/lib/utils/date";
import { OVERTIME_PATTERN } from "../consts";

type Props = {
  billableMinutes: number;
  nonBillableMinutes: number;
  plannedMinutes: number;
};

const COLOR_BILLABLE = "bg-emerald-300";
const COLOR_BILLABLE_DOT = "bg-emerald-400";
const COLOR_NON_BILLABLE = "bg-lime-100";
const COLOR_NON_BILLABLE_DOT = "bg-lime-100";

type BarSegment = {
  key: string;
  label: string;
  minutes: number;
  bgColorClass: string;
  dotColorClass: string;
  left: number;
  width: number;
  crossesPlanned: boolean;
  overtimeWidth: number;
  isFullyOvertime: boolean;
};

function buildBarSegments(
  entries: {
    key: string;
    label: string;
    minutes: number;
    bgColorClass: string;
    dotColorClass: string;
  }[],
  plannedMinutes: number,
  scaleMinutes: number,
): BarSegment[] {
  let cumulative = 0;

  return entries
    .filter((entry) => entry.minutes > 0)
    .map((entry) => {
      const start = cumulative;
      const end = cumulative + entry.minutes;

      const left = (start / scaleMinutes) * 100;
      const width = (entry.minutes / scaleMinutes) * 100;

      const crossesPlanned = start < plannedMinutes && end > plannedMinutes;
      const isFullyOvertime = start >= plannedMinutes;

      let overtimeWidth = 0;
      if (isFullyOvertime) {
        overtimeWidth = width;
      } else if (crossesPlanned) {
        overtimeWidth = width * ((end - plannedMinutes) / entry.minutes);
      }

      cumulative = end;

      return {
        ...entry,
        left,
        width,
        crossesPlanned,
        isFullyOvertime,
        overtimeWidth,
      };
    });
}

export const WeekProgressBar = ({
  billableMinutes,
  nonBillableMinutes,
  plannedMinutes,
}: Props) => {
  const totalMinutes = billableMinutes + nonBillableMinutes;
  const overMinutes = Math.max(0, totalMinutes - plannedMinutes);
  const isOverTarget = overMinutes > 0;

  const scaleMinutes = Math.max(totalMinutes, plannedMinutes, 1);
  const plannedPercent = Math.min((plannedMinutes / scaleMinutes) * 100, 100);

  const segments = useMemo(
    () =>
      buildBarSegments(
        [
          {
            key: "billable",
            label: "Billable",
            minutes: billableMinutes,
            bgColorClass: COLOR_BILLABLE,
            dotColorClass: COLOR_BILLABLE_DOT,
          },
          {
            key: "non-billable",
            label: "Non-billable",
            minutes: nonBillableMinutes,
            bgColorClass: COLOR_NON_BILLABLE,
            dotColorClass: COLOR_NON_BILLABLE_DOT,
          },
        ],
        plannedMinutes,
        scaleMinutes,
      ),
    [billableMinutes, nonBillableMinutes, plannedMinutes, scaleMinutes],
  );

  return (
    <div className="flex w-full flex-col gap-2 select-none">
      <div className="group relative h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        {isOverTarget && (
          <div
            className={`pointer-events-none absolute inset-y-0 ${OVERTIME_PATTERN}`}
            style={{ left: `${plannedPercent}%`, right: 0 }}
          />
        )}

        {segments.map((segment) => {
          const percentOfTotal = Math.round(
            (segment.minutes / scaleMinutes) * 100,
          );

          return (
            <div
              key={segment.key}
              title={`${segment.label}: ${formatDuration(segment.minutes)} (${percentOfTotal}%)`}
              className={`absolute inset-y-0 ${segment.bgColorClass} transition-all duration-300 hover:brightness-95`}
              style={{
                left: `${segment.left}%`,
                width: `${segment.width}%`,
              }}
            >
              {(segment.crossesPlanned || segment.isFullyOvertime) &&
                segment.overtimeWidth > 0 && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.4)_0px,rgba(255,255,255,0.4)_3px,rgba(0,0,0,0.06)_3px,rgba(0,0,0,0.06)_6px)]"
                    style={{
                      width: `${(segment.overtimeWidth / segment.width) * 100}%`,
                    }}
                  />
                )}
            </div>
          );
        })}

        {plannedPercent > 0 && plannedPercent < 100 && (
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-px border-r border-dashed border-zinc-400/50"
            style={{ left: `${plannedPercent}%` }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${COLOR_BILLABLE_DOT} border border-slate-300`}
            />
            Billable:{" "}
            <span className="font-medium text-zinc-700">
              {formatDuration(billableMinutes)}
            </span>
          </span>

          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${COLOR_NON_BILLABLE_DOT} border border-slate-300`}
            />
            Non-billable:{" "}
            <span className="font-medium text-zinc-700">
              {formatDuration(nonBillableMinutes)}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-zinc-400">
          <span>
            Target:{" "}
            <span className="text-zinc-600 font-medium">
              {formatDuration(plannedMinutes)}
            </span>
          </span>

          {isOverTarget && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.2 text-[10px] font-medium text-amber-600 border border-amber-200/60">
              +{formatDuration(overMinutes)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
