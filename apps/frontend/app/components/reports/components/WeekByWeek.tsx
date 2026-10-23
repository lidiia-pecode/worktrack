"use client";

import { PeopleReport, ReportRange, TimelineBucket } from "@/types";
import { useTimeline } from "@/hooks/useTimeline";
import { cn } from "@/lib/utils/cn";
import { formatReportHours } from "@/lib/utils/date";
import { bucketLabel, bucketNote, hourScale } from "@/lib/utils/report-charts";
import { percentOf } from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";

const heightOn = (minutes: number, endMinutes: number) =>
  `${(minutes / endMinutes) * 100}%`;

/** Room for a week's label and hours, gap included; past it the chart scrolls. */
const MIN_COLUMN_REM = 5;

const LEGEND = [
  { label: "Logged", className: "bg-brand" },
  { label: "Planned", className: "bg-report-planned" },
  { label: "Expected", className: "border border-border bg-report-expected" },
];

const Figure = ({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) => (
  <div>
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
      {value}
    </dd>
    <dd className="text-sm text-muted-foreground">{note}</dd>
  </div>
);

/** A week's figures in words, for its panel and for screen readers. */
const weekSummary = (bucket: TimelineBucket) =>
  [
    `${formatReportHours(bucket.loggedMinutes)} logged`,
    bucket.plannedMinutes > 0
      ? `${formatReportHours(bucket.plannedMinutes)} planned`
      : "not planned",
    bucket.expectedMinutes > 0
      ? `${formatReportHours(bucket.expectedMinutes)} expected`
      : "nothing expected",
  ].join(" · ");

const WeekColumn = ({
  bucket,
  endMinutes,
}: {
  bucket: TimelineBucket;
  endMinutes: number;
}) => (
  // Focusable, so its figures open by keyboard and on a tap as well as on hover.
  <div
    tabIndex={0}
    role="img"
    aria-label={`${bucketLabel(bucket)}: ${weekSummary(bucket)}`}
    className="group relative flex h-full items-end justify-center rounded-t-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <span
      className="absolute inset-x-[12%] bottom-0 rounded-t-lg bg-report-expected"
      style={{ height: heightOn(bucket.expectedMinutes, endMinutes) }}
    />
    <span className="relative flex h-full w-3/5 max-w-16 items-end gap-1">
      <span
        className="flex-1 rounded-t-md bg-brand"
        style={{ height: heightOn(bucket.loggedMinutes, endMinutes) }}
      />
      <span
        className="flex-1 rounded-t-md bg-report-planned"
        style={{ height: heightOn(bucket.plannedMinutes, endMinutes) }}
      />
    </span>
    <span className="pointer-events-none absolute top-0 left-1/2 z-10 hidden w-max max-w-56 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-raised group-hover:block group-focus:block">
      <span className="block font-semibold">{bucketLabel(bucket)}</span>
      {weekSummary(bucket)}
    </span>
  </div>
);

type WeekByWeekProps = {
  range: ReportRange;
  totals: PeopleReport["totals"];
};

/**
 * The month at the top of the page: its three figures, and each week as a
 * pale block of what was expected with what was logged and planned standing
 * inside it.
 */
export const WeekByWeek = ({ range, totals }: WeekByWeekProps) => {
  const timeline = useTimeline(range);
  const { loggedMinutes, plannedMinutes, billableMinutes, expectedMinutes } =
    totals;

  const renderChart = () => {
    if (timeline.isLoading) {
      return <LoadingState size="compact" title="Loading the weeks…" />;
    }
    if (timeline.isError || !timeline.timeline) {
      return (
        <ErrorState
          size="compact"
          title="We couldn't load the weeks"
          onRetry={() => void timeline.refetch()}
        />
      );
    }

    const { buckets, countedUntil } = timeline.timeline;
    const scale = hourScale(
      Math.max(
        0,
        ...buckets.flatMap((bucket) => [
          bucket.loggedMinutes,
          bucket.plannedMinutes,
          bucket.expectedMinutes,
        ]),
      ),
    );
    const columns = {
      gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
    };

    return (
      <div
        className={cn(
          "mt-6 flex gap-3",
          timeline.isPlaceholderData && "opacity-60 transition-opacity",
        )}
        aria-busy={timeline.isPlaceholderData}
      >
        <div
          className="relative h-48 w-11 shrink-0 text-xs text-muted-foreground tabular-nums"
          aria-hidden
        >
          {scale.ticks.slice(1).map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: heightOn(tick, scale.endMinutes) }}
            >
              {formatReportHours(tick)}
            </span>
          ))}
        </div>
        <div
          role="group"
          aria-label="Weeks, scrolls sideways when narrow"
          tabIndex={0}
          className="min-w-0 flex-1 overflow-x-auto rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <div style={{ minWidth: `${buckets.length * MIN_COLUMN_REM}rem` }}>
            <div className="relative h-48 border-b border-border">
              {scale.ticks.slice(1).map((tick) => (
                <span
                  key={tick}
                  className="absolute inset-x-0 border-t border-border/50"
                  style={{ bottom: heightOn(tick, scale.endMinutes) }}
                  aria-hidden
                />
              ))}
              <div className="absolute inset-0 grid gap-4" style={columns}>
                {buckets.map((bucket) => (
                  <WeekColumn
                    key={bucket.start}
                    bucket={bucket}
                    endMinutes={scale.endMinutes}
                  />
                ))}
              </div>
            </div>
            <div
              className="mt-2 grid gap-4 text-center text-sm"
              style={columns}
              aria-hidden
            >
              {buckets.map((bucket) => (
                <div key={bucket.start} className="min-w-0">
                  <p className="truncate font-medium">{bucketLabel(bucket)}</p>
                  <p className="tabular-nums">
                    {formatReportHours(bucket.loggedMinutes)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {bucketNote(bucket, countedUntil)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card as="section" aria-labelledby="report-timeline" className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="report-timeline" className="text-base font-semibold">
          Week by week
        </h2>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {LEGEND.map(({ label, className }) => (
            <li key={label} className="inline-flex items-center gap-2">
              <span
                className={cn("size-3.5 rounded-sm", className)}
                aria-hidden
              />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-14 gap-y-4">
        <Figure
          label="Logged"
          value={formatReportHours(loggedMinutes)}
          note={
            expectedMinutes > 0
              ? `${percentOf(loggedMinutes, expectedMinutes)}% of ${formatReportHours(expectedMinutes)} expected`
              : "Nobody was expected to work"
          }
        />
        <Figure
          label="Planned"
          value={formatReportHours(plannedMinutes)}
          note={
            expectedMinutes > 0
              ? `${percentOf(plannedMinutes, expectedMinutes)}% of expected`
              : "Nothing expected to plan against"
          }
        />
        <Figure
          label="Billable"
          value={formatReportHours(billableMinutes)}
          note={`${percentOf(billableMinutes, loggedMinutes)}% of logged`}
        />
      </dl>

      {renderChart()}
    </Card>
  );
};
