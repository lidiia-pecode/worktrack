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
  hasSomethingToShow,
  hourScale,
} from "@/lib/utils/report-charts";
import { percentOf } from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

import { PeriodBand } from "./PeriodBand";

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
  { label: "Billable", className: "bg-stripes-billable" },
  { label: "Not billable", className: "bg-report-logged" },
  { label: "Planned", className: "bg-report-planned" },
  { label: "Expected", className: "border border-border bg-report-expected" },
];

type FigureCardProps = {
  label: string;
  value: string;
  /** The share the bar draws; none without anything to measure against. */
  percent: number | null;
  /** The bar's colour, as a text-colour class it draws from. */
  tone: string;
  note: string;
};

const FigureCard = ({ label, value, percent, tone, note }: FigureCardProps) => (
  <li className="min-w-0 rounded-xl border border-brand-strong bg-card px-4 py-3.5 @sm:px-3 @sm:py-3 @3xl:px-4 @3xl:py-3.5">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>

    <p className="text-3xl font-semibold tracking-tight @sm:text-2xl @3xl:text-3xl">
      {value}
    </p>

    <p className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
      <span className="min-w-0">{note}</span>

      {percent !== null && (
        <span className="shrink-0 font-semibold text-foreground">
          {percent}%
        </span>
      )}
    </p>

    {percent !== null && (
      <span
        aria-hidden
        className={cn(
          "mt-2 block h-1.5 overflow-hidden rounded-full bg-current/15",
          tone,
        )}
      >
        <span
          className="block h-full rounded-full bg-current"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </span>
    )}
  </li>
);

const TITLES: Record<TimelineBucketSize, string> = {
  week: "Week by week",
  month: "Month by month",
};

const SCROLL_LABELS: Record<TimelineBucketSize, string> = {
  week: "Weeks, scrolls sideways when narrow",
  month: "Months, scrolls sideways when narrow",
};

/** Time logged past what was expected, ending the logged bar as on a row. */
const overExpected = ({ loggedMinutes, expectedMinutes }: TimelineBucket) =>
  expectedMinutes > 0 ? Math.max(0, loggedMinutes - expectedMinutes) : 0;

const OVER_LEGEND = { label: "Over expected", className: "bg-warning" };

/** A week's or a month's figures in words, for its tip and for screen readers. */
const bucketSummary = (bucket: TimelineBucket, countedUntil: string | null) =>
  [
    bucketNote(bucket, countedUntil),
    `${formatReportHours(bucket.loggedMinutes)} logged`,
    `${formatReportHours(bucket.billableMinutes)} billable`,
    bucket.plannedMinutes > 0
      ? `${formatReportHours(bucket.plannedMinutes)} planned`
      : "not planned",
    bucket.expectedMinutes > 0
      ? `${formatReportHours(bucket.expectedMinutes)} expected`
      : "nothing expected",
    overExpected(bucket) > 0 &&
      `${formatReportHours(overExpected(bucket))} over expected`,
  ]
    .filter(Boolean)
    .join(" · ");

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
        className="relative flex-1 overflow-hidden rounded-t-md bg-report-logged"
        style={{ height: heightOn(bucket.loggedMinutes, endMinutes) }}
      >
        <span
          className="absolute inset-x-0 bottom-0 bg-stripes-billable"
          style={{
            height: `${percentOf(bucket.billableMinutes, bucket.loggedMinutes)}%`,
          }}
        />
        {overExpected(bucket) > 0 && (
          <span
            className="absolute inset-x-0 top-0 bg-warning"
            style={{
              height: `${(overExpected(bucket) / bucket.loggedMinutes) * 100}%`,
            }}
          />
        )}
      </span>
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

type PeriodOverviewProps = {
  timeline: Timeline;
  totals: PeopleReport["totals"];
  /** The company's first day; the chart starts there. */
  firstDay?: string;
  /** What the figures cover: "October 2026", "Nov 1 - Nov 7 so far". */
  periodLabel: string;
};

/**
 * The period's summary band, three figures with their share, above
 * a chart of each week or month: expected behind, logged and planned inside.
 */
export const PeriodOverview = ({
  timeline,
  totals,
  firstDay,
  periodLabel,
}: PeriodOverviewProps) => {
  const { loggedMinutes, plannedMinutes, billableMinutes, expectedMinutes } =
    totals;
  const isExpected = expectedMinutes > 0;

  const { countedUntil, bucketSize } = timeline;
  const buckets = bucketsSinceCompanyStart(timeline.buckets, firstDay).filter(
    hasSomethingToShow,
  );
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
    <Card as="section" aria-labelledby="report-period">
      <PeriodBand titleId="report-period" label={periodLabel}>
        <ul className="grid gap-3 @sm:grid-cols-3 @3xl:gap-4">
          <FigureCard
            label="Logged"
            value={formatReportHours(loggedMinutes)}
            percent={
              isExpected ? percentOf(loggedMinutes, expectedMinutes) : null
            }
            tone="text-report-logged"
            note={
              isExpected
                ? `of ${formatReportHours(expectedMinutes)} expected`
                : "Nobody was expected to work"
            }
          />
          <FigureCard
            label="Planned"
            value={formatReportHours(plannedMinutes)}
            percent={
              isExpected ? percentOf(plannedMinutes, expectedMinutes) : null
            }
            tone="text-report-planned-strong"
            note={
              isExpected ? "of expected" : "Nothing expected to plan against"
            }
          />
          <FigureCard
            label="Billable"
            value={formatReportHours(billableMinutes)}
            percent={
              loggedMinutes > 0
                ? percentOf(billableMinutes, loggedMinutes)
                : null
            }
            tone="text-brand"
            note={loggedMinutes > 0 ? "of logged" : "Nothing logged yet"}
          />
        </ul>
      </PeriodBand>

      <section aria-labelledby="report-timeline" className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3
            id="report-timeline"
            className="text-sm font-medium text-muted-foreground"
          >
            {TITLES[bucketSize]}
          </h3>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {[
              ...LEGEND,
              ...(buckets.some((bucket) => overExpected(bucket) > 0)
                ? [OVER_LEGEND]
                : []),
            ].map(({ label, className }) => (
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

        <div className="mt-6 flex gap-3">
          <div
            className="relative h-48 w-11 shrink-0 text-xs text-muted-foreground"
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
      </section>
    </Card>
  );
};
