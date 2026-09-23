"use client";

import { useHoursReport } from "@/hooks/useHoursReport";
import { HoursReportGroupBy } from "@/types/enums";

import { DateRange } from "./ReportFilters";
import { HoursReportTable } from "./HoursReportTable";
import { ReportSection } from "./ReportSection";

type HoursReportSectionProps = {
  range: DateRange;
  groupBy: HoursReportGroupBy;
};

export const HoursReportSection = ({
  range,
  groupBy,
}: HoursReportSectionProps) => {
  const { report, isLoading, isPlaceholderData, isError, refetch } =
    useHoursReport({ ...range, groupBy });

  return (
    <ReportSection
      isLoading={isLoading}
      isError={isError}
      isEmpty={!report || report.rows.length === 0}
      isPlaceholderData={isPlaceholderData}
      isProvisional={Boolean(report?.isProvisional)}
      emptyTitle="No time logged in this range"
      emptyDescription="Pick another period, or check that people have logged their time."
      onRetry={refetch}
    >
      {report && (
        // The rows' own grouping, not the selected one: while the next
        // grouping loads, the previous rows stay on screen.
        <HoursReportTable
          groupBy={report.groupBy}
          rows={report.rows}
          totals={report.totals}
        />
      )}
    </ReportSection>
  );
};
