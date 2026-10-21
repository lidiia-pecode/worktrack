"use client";

import { useHoursReport } from "@/hooks/useHoursReport";
import { DateRange } from "@/lib/utils/report-period";

import { HoursReportTable, HoursTableGrouping } from "./HoursReportTable";
import { ReportSection } from "./ReportSection";

type HoursReportSectionProps = {
  range: DateRange;
  groupBy: HoursTableGrouping;
  /** The period in words, for the table's label. */
  periodText: string;
};

export const HoursReportSection = ({
  range,
  groupBy,
  periodText,
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
      emptyTitle="Nothing logged or planned in this range"
      emptyDescription="Pick another period, or check that people have logged their time."
      onRetry={refetch}
    >
      {report && (
        // The rows' own grouping, not the selected one: while the next
        // grouping loads, the previous rows stay on screen.
        <HoursReportTable
          key={report.groupBy}
          groupBy={report.groupBy as HoursTableGrouping}
          rows={report.rows}
          totals={report.totals}
          periodText={periodText}
        />
      )}
    </ReportSection>
  );
};
