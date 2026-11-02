"use client";

import {
  PeopleReport,
  Timeline,
  TimelineBucket,
  TimelineBucketSize,
} from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatReportHours } from "@/lib/utils/date";
import {
  bucketLabel,
  bucketNote,
  bucketsSinceCompanyStart,
  hourScale,
} from "@/lib/utils/report-charts";
import { percentOf } from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

const heightOn = (minutes: number, endMinutes: number) =>
  `${(minutes / endMinutes) * 100}%`;

/**
 * Room for a column's label, gap included, so a week's whole "Sep 28 – Oct 4"
 * fits; past it the chart scrolls sideways.
 */
const MIN_COLUMN_REM: Record<TimelineBucketSize, number> = {
  week: 7.5,
  month: 4,
};

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

const TITLES: Record<TimelineBucketSize, string> = {
  week: "Week by week",
  month: "Month by month",
};

const SCROLL_LABELS: Record<TimelineBucketSize, string> = {
  week: "Weeks, scrolls sideways when narrow",
  month: "Months, scrolls sideways when narrow",
};

/** A week's or a month's figures in words, for its tip and for screen readers. */
const bucketSummary = (bucket: TimelineBucket, countedUntil: string | null) =>
  [
    bucketNote(bucket, countedUntil),
    `${formatReportHours(bucket.loggedMinutes)} logged`,
    bucket.plannedMinutes > 0
      ? `${formatReportHours(bucket.plannedMinutes)} planned`
      : "not planned",
    bucket.expectedMinutes > 0
      ? `${formatReportHours(bucket.expectedMinutes)} expected`
      : "nothing expected",
  ].join(" · ");

const BucketColumn = ({
  bucket,
  label,
  countedUntil,
  endMinutes,
}: {
  bucket: TimelineBucket;
  label: string;
  countedUntil: string | null;
  endMinutes: number;
}) => (
  // Focusable, so its figures open by keyboard and on a tap as well as on hover.
  <div
    tabIndex={0}
    role="img"
    aria-label={`${label}: ${bucketSummary(bucket, countedUntil)}`}
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
      <span className="block font-semibold">{label}</span>
      {bucketSummary(bucket, countedUntil)}
    </span>
  </div>
);

type WeekByWeekProps = {
  timeline: Timeline;
  totals: PeopleReport["totals"];
  /** The company's first day; the chart starts there. */
  firstDay?: string;
};

/**
 * The period at the top of the page: its three figures, and each week or month
 * as a pale block of what was expected with what was logged and planned
 * standing inside it.
 */
export const WeekByWeek = ({ timeline, totals, firstDay }: WeekByWeekProps) => {
  const { loggedMinutes, plannedMinutes, billableMinutes, expectedMinutes } =
    totals;

  const { countedUntil, bucketSize } = timeline;
  const buckets = bucketsSinceCompanyStart(timeline.buckets, firstDay);
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
    <Card as="section" aria-labelledby="report-timeline" className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="report-timeline" className="text-base font-semibold">
          {TITLES[bucketSize]}
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

      <div className="mt-6 flex gap-3">
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
          aria-label={SCROLL_LABELS[bucketSize]}
          tabIndex={0}
          className="min-w-0 flex-1 overflow-x-auto rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <div
            style={{
              minWidth: `${buckets.length * MIN_COLUMN_REM[bucketSize]}rem`,
            }}
          >
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
                  <BucketColumn
                    key={bucket.start}
                    bucket={bucket}
                    label={bucketLabel(bucket, bucketSize)}
                    countedUntil={countedUntil}
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
                <p key={bucket.start} className="truncate font-medium">
                  {bucketLabel(bucket, bucketSize)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
