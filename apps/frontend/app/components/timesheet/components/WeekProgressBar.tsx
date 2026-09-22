"use client";

import { useMemo } from "react";
import { formatDuration } from "@/lib/utils/date";
import { OVERTIME_PATTERN, OVERTIME_SEGMENT_PATTERN } from "../consts";
import { Badge } from "@/components/ui/badge";

type Props = {
  billableMinutes: number;
  nonBillableMinutes: number;
  expectedMinutes: number;
};

const COLOR_BILLABLE = "bg-brand/70";
const COLOR_BILLABLE_DOT = "bg-brand/70";
const COLOR_NON_BILLABLE = "bg-brand/25";
const COLOR_NON_BILLABLE_DOT = "bg-brand/25";

type BarSegment = {
  key: string;
  label: string;
  minutes: number;
  bgColorClass: string;
  dotColorClass: string;
  left: number;
  width: number;
  crossesExpected: boolean;
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
  expectedMinutes: number,
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

      const crossesExpected = start < expectedMinutes && end > expectedMinutes;
      const isFullyOvertime = start >= expectedMinutes;

      let overtimeWidth = 0;
      if (isFullyOvertime) {
        overtimeWidth = width;
      } else if (crossesExpected) {
        overtimeWidth = width * ((end - expectedMinutes) / entry.minutes);
      }

      cumulative = end;

      return {
        ...entry,
        left,
        width,
        crossesExpected,
        isFullyOvertime,
        overtimeWidth,
      };
    });
}

export const WeekProgressBar = ({
  billableMinutes,
  nonBillableMinutes,
  expectedMinutes,
}: Props) => {
  const totalMinutes = billableMinutes + nonBillableMinutes;
  const overMinutes = Math.max(0, totalMinutes - expectedMinutes);
  const isOverExpected = overMinutes > 0;

  const scaleMinutes = Math.max(totalMinutes, expectedMinutes, 1);
  const expectedPercent = Math.min((expectedMinutes / scaleMinutes) * 100, 100);

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
        expectedMinutes,
        scaleMinutes,
      ),
    [billableMinutes, nonBillableMinutes, expectedMinutes, scaleMinutes],
  );

  return (
    <div className="flex w-full flex-col gap-2 select-none">
      <div className="group relative h-2 w-full overflow-hidden rounded-full bg-muted/30">
        {isOverExpected && (
          <div
            className={`pointer-events-none absolute inset-y-0 ${OVERTIME_PATTERN}`}
            style={{ left: `${expectedPercent}%`, right: 0 }}
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
              {(segment.crossesExpected || segment.isFullyOvertime) &&
                segment.overtimeWidth > 0 && (
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-0 right-0 ${OVERTIME_SEGMENT_PATTERN}`}
                    style={{
                      width: `${(segment.overtimeWidth / segment.width) * 100}%`,
                    }}
                  />
                )}
            </div>
          );
        })}

        {expectedPercent > 0 && expectedPercent < 100 && (
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-px border-r border-dashed border-muted-foreground/50"
            style={{ left: `${expectedPercent}%` }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${COLOR_BILLABLE_DOT} border border-border`}
            />
            Billable:{" "}
            <span className="font-medium text-foreground">
              {formatDuration(billableMinutes)}
            </span>
          </span>

          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${COLOR_NON_BILLABLE_DOT} border border-border`}
            />
            Non-billable:{" "}
            <span className="font-medium text-foreground">
              {formatDuration(nonBillableMinutes)}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <span>
            Expected:{" "}
            <span className="text-foreground font-medium">
              {formatDuration(expectedMinutes)}
            </span>
          </span>

          {isOverExpected && (
            <Badge
              variant="warning"
              className="px-1.5 py-0.2 text-[10px] font-medium"
            >
              +{formatDuration(overMinutes)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
