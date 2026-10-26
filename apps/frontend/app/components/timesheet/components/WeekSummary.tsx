"use client";

import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import { percentOf } from "@/lib/utils/report-overview";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type WeekSummaryProps = {
  billableMinutes: number;
  nonBillableMinutes: number;
  expectedMinutes: number;
  /** The working days off that lower what was expected, e.g. "Fri 23, public holiday". */
  daysOff: string[];
  /** Of the time logged, how much is on the weekend: all of it extra. */
  weekendMinutes: number;
  className?: string;
};

const WeekBar = ({
  billableMinutes,
  nonBillableMinutes,
  expectedMinutes,
}: Pick<
  WeekSummaryProps,
  "billableMinutes" | "nonBillableMinutes" | "expectedMinutes"
>) => {
  const totalMinutes = billableMinutes + nonBillableMinutes;
  const scale = Math.max(totalMinutes, expectedMinutes, 1);
  const percent = (minutes: number) => (minutes / scale) * 100;

  return (
    <span
      aria-hidden
      className="relative block h-1.5 min-w-20 flex-1 overflow-hidden rounded-full bg-report-track"
    >
      <span
        className="absolute inset-y-0 left-0 bg-brand/70"
        style={{ width: `${percent(billableMinutes)}%` }}
      />
      <span
        className="absolute inset-y-0 bg-brand/25"
        style={{
          left: `${percent(billableMinutes)}%`,
          width: `${percent(nonBillableMinutes)}%`,
        }}
      />
      {totalMinutes > expectedMinutes && (
        <span
          className="absolute inset-y-0 right-0 bg-warning/60"
          style={{ left: `${percent(expectedMinutes)}%` }}
        />
      )}
    </span>
  );
};

const Fact = ({
  label,
  value,
  note,
  isWarning = false,
}: {
  label: string;
  value: string;
  note?: string;
  isWarning?: boolean;
}) => (
  <div className="grid grid-cols-[1fr_auto] gap-x-6">
    <dt className="text-muted-foreground">{label}</dt>
    <dd
      className={cn(
        "font-medium tabular-nums",
        isWarning ? "text-warning-text" : "text-foreground",
      )}
    >
      {value}
    </dd>
    {note && (
      <dd className="col-span-2 mt-0.5 text-xs text-muted-foreground">
        {note}
      </dd>
    )}
  </div>
);

/** The week against expected; it opens the breakdown, so nothing is only on hover. */
export const WeekSummary = ({
  billableMinutes,
  nonBillableMinutes,
  expectedMinutes,
  daysOff,
  weekendMinutes,
  className,
}: WeekSummaryProps) => {
  const totalMinutes = billableMinutes + nonBillableMinutes;
  const overMinutes = totalMinutes - expectedMinutes;
  const isComplete = expectedMinutes > 0 && overMinutes === 0;

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${formatDuration(totalMinutes)} of ${formatDuration(expectedMinutes)} expected. Show the week's breakdown`}
        className={cn(
          "flex h-8 min-w-0 items-center gap-3 rounded-md border border-transparent px-2 text-sm transition-colors hover:border-border hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-popup-open:border-border data-popup-open:bg-card max-sm:h-10",
          className,
        )}
      >
        <span className="whitespace-nowrap tabular-nums">
          <span className="font-semibold">{formatDuration(totalMinutes)}</span>
          <span className="text-muted-foreground">
            {" "}
            / {formatDuration(expectedMinutes)}
          </span>
        </span>
        <WeekBar
          billableMinutes={billableMinutes}
          nonBillableMinutes={nonBillableMinutes}
          expectedMinutes={expectedMinutes}
        />
        {overMinutes > 0 && (
          <span className="text-xs font-medium whitespace-nowrap text-warning-text tabular-nums">
            +{formatDuration(overMinutes)}
          </span>
        )}
        {isComplete && (
          <Badge variant="success" className="px-1.5 text-2xs font-medium">
            <Check className="size-3" aria-hidden />
            Complete
          </Badge>
        )}
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(18rem,calc(100vw-2rem))] p-4 text-sm"
      >
        <dl className="flex flex-col gap-2.5">
          <Fact label="Logged" value={formatDuration(totalMinutes)} />
          <Fact
            label="Expected"
            value={formatDuration(expectedMinutes)}
            note={
              daysOff.length > 0
                ? `Lower for days off: ${daysOff.join(", ")}`
                : undefined
            }
          />
          <Fact
            label="Billable"
            value={`${formatDuration(billableMinutes)} · ${percentOf(billableMinutes, totalMinutes)}%`}
          />
          <Fact
            label="Non-billable"
            value={formatDuration(nonBillableMinutes)}
          />
          {overMinutes > 0 && (
            <Fact
              label="More than expected"
              value={formatDuration(overMinutes)}
              note={
                weekendMinutes > 0
                  ? `${formatDuration(Math.min(weekendMinutes, overMinutes))} of it at the weekend`
                  : undefined
              }
              isWarning
            />
          )}
        </dl>
      </PopoverContent>
    </Popover>
  );
};
