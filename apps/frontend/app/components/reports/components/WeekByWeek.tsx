import { Timeline, TimelineBucket } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import { bucketLabel, bucketNote } from "@/lib/utils/report-charts";
import { hourScale } from "@/lib/utils/report-overview";

import { Card } from "@/components/ui/card";

const heightOn = (minutes: number, endMinutes: number) =>
  `${(minutes / endMinutes) * 100}%`;

// A missing value is said, never shown as 0h, as on the bars.
const expectedText = ({ expectedMinutes }: TimelineBucket) =>
  expectedMinutes > 0
    ? `${formatDuration(expectedMinutes)} expected`
    : "nothing expected";
const plannedText = ({ plannedMinutes }: TimelineBucket) =>
  plannedMinutes > 0
    ? `${formatDuration(plannedMinutes)} planned`
    : "not planned";

/** Room for a column's label and hours, gap included; past it the chart scrolls. */
const MIN_COLUMN_REM = 3.75;

/**
 * The period's hours over time, one column per week (or month, for a quarter
 * or a year), in the same marks as the bars: logged as the column, expected as
 * a line, planned as a ring. A week the range or yesterday cuts short is pale.
 */
export const WeekByWeek = ({ timeline }: { timeline: Timeline }) => {
  const { interval, buckets, countedUntil } = timeline;
  const scale = hourScale(
    Math.max(
      0,
      ...buckets.flatMap((bucket) => [
        bucket.loggedMinutes,
        bucket.expectedMinutes,
        bucket.plannedMinutes,
      ]),
    ),
  );
  const columns = {
    gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
  };
  const unit = interval === "week" ? "week" : "month";

  return (
    <Card as="section" aria-labelledby="report-timeline" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="report-timeline" className="text-base font-semibold">
            {interval === "week" ? "Week by week" : "Month by month"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Hours logged each {unit}, against expected and planned
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-brand" aria-hidden />
            Logged
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span
              className="h-0.5 w-3.5 rounded-full bg-foreground"
              aria-hidden
            />
            Expected
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full border-2 border-report-plan"
              aria-hidden
            />
            Planned
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-brand/40" aria-hidden />
            Part of a {unit}
          </li>
        </ul>
      </div>

      <div className="mt-2 flex gap-3">
        <div
          className="relative mt-4 h-44 w-10 shrink-0 text-2xs text-muted-foreground tabular-nums"
          aria-hidden
        >
          {scale.ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: heightOn(tick, scale.endMinutes) }}
            >
              {formatDuration(tick)}
            </span>
          ))}
        </div>
        <div
          role="group"
          aria-label={`Hours each ${unit}, scrolls sideways when narrow`}
          tabIndex={0}
          className="min-w-0 flex-1 overflow-x-auto rounded-md pt-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <div
            style={{ minWidth: `${buckets.length * MIN_COLUMN_REM}rem` }}
            aria-hidden
          >
            <div className="relative h-44">
              {scale.ticks.map((tick) => (
                <span
                  key={tick}
                  className="absolute inset-x-0 border-t border-border/70"
                  style={{ bottom: heightOn(tick, scale.endMinutes) }}
                />
              ))}
              <div className="absolute inset-0 grid gap-3" style={columns}>
                {buckets.map((bucket) => (
                  <div
                    key={bucket.start}
                    className="relative flex h-full items-end justify-center"
                    title={`${bucketLabel(bucket, interval)}: ${formatDuration(bucket.loggedMinutes)} logged, ${expectedText(bucket)}, ${plannedText(bucket)}`}
                  >
                    <span
                      className="absolute text-2xs font-medium tabular-nums"
                      style={{
                        bottom: `calc(${heightOn(bucket.loggedMinutes, scale.endMinutes)} + 0.5rem)`,
                      }}
                    >
                      {formatDuration(bucket.loggedMinutes)}
                    </span>
                    <span
                      className={cn(
                        "w-3/5 max-w-12 rounded-t-md",
                        bucket.isPartial ? "bg-brand/40" : "bg-brand",
                      )}
                      style={{
                        height: heightOn(
                          bucket.loggedMinutes,
                          scale.endMinutes,
                        ),
                      }}
                    />
                    {bucket.expectedMinutes > 0 && (
                      <span
                        className="absolute inset-x-[15%] h-0.5 translate-y-1/2 rounded-full bg-foreground"
                        style={{
                          bottom: heightOn(
                            bucket.expectedMinutes,
                            scale.endMinutes,
                          ),
                        }}
                      />
                    )}
                    {bucket.plannedMinutes > 0 && (
                      <span
                        className="absolute left-1/2 size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-report-plan bg-card"
                        style={{
                          bottom: heightOn(
                            bucket.plannedMinutes,
                            scale.endMinutes,
                          ),
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 grid gap-3 text-center" style={columns}>
              {buckets.map((bucket) => (
                <div key={bucket.start} className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {bucketLabel(bucket, interval)}
                  </p>
                  {interval === "week" && (
                    <p className="truncate text-2xs text-muted-foreground">
                      {bucketNote(bucket, countedUntil)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>
          Hours logged each {unit}, against expected and planned
        </caption>
        <thead>
          <tr>
            <th scope="col">{interval === "week" ? "Week" : "Month"}</th>
            <th scope="col">Logged</th>
            <th scope="col">Expected</th>
            <th scope="col">Planned</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.start}>
              <th scope="row">
                {bucketLabel(bucket, interval)}
                {bucket.isPartial && ", part of a " + unit}
              </th>
              <td>{formatDuration(bucket.loggedMinutes)}</td>
              <td>{expectedText(bucket)}</td>
              <td>{plannedText(bucket)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};
