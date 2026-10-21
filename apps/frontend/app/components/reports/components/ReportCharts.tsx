"use client";

import { HoursReportGroupBy } from "@/types/enums";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";
import { useHoursReport } from "@/hooks/useHoursReport";
import { useTimeline } from "@/hooks/useTimeline";
import { kindOfWork } from "@/lib/utils/report-charts";
import { DateRange } from "@/lib/utils/report-period";

import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";
import { KindOfWork } from "./KindOfWork";
import { WeekByWeek } from "./WeekByWeek";

/**
 * The two pictures under the cards: hours over time and the kind of work.
 * They load on their own, so a slow chart never holds up the figures above.
 */
export const ReportCharts = ({ range }: { range: DateRange }) => {
  const timeline = useTimeline(range);
  const activities = useHoursReport({
    ...range,
    groupBy: HoursReportGroupBy.ACTIVITY,
  });
  const categories = useActivityCategoriesAllPagesQuery();

  if (timeline.isLoading || activities.isLoading || categories.isLoading) {
    return <LoadingState size="compact" title="Loading the charts…" />;
  }

  if (
    timeline.isError ||
    activities.isError ||
    categories.isError ||
    !timeline.timeline ||
    !activities.report
  ) {
    return (
      <ErrorState
        size="compact"
        title="We couldn't load the charts"
        onRetry={() => {
          void timeline.refetch();
          void activities.refetch();
          void categories.refetch();
        }}
      />
    );
  }

  return (
    <div className="grid items-start gap-4 @5xl:grid-cols-[2fr_1fr]">
      {timeline.timeline.buckets.length > 0 && (
        <WeekByWeek timeline={timeline.timeline} />
      )}
      <KindOfWork
        shares={kindOfWork(
          activities.report.rows,
          categories.items.map((category) => category.name),
        )}
      />
    </div>
  );
};
