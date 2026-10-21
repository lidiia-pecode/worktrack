"use client";

import { usePeopleReport } from "@/hooks/usePeopleReport";
import { DateRange } from "@/lib/utils/report-period";

import { PeopleReportTable } from "./PeopleReportTable";
import { ReportSection } from "./ReportSection";

type PeopleReportSectionProps = {
  range: DateRange;
  /** The period in words, for the table's label. */
  periodText: string;
};

export const PeopleReportSection = ({
  range,
  periodText,
}: PeopleReportSectionProps) => {
  const { report, isLoading, isPlaceholderData, isError, refetch } =
    usePeopleReport(range);

  return (
    <ReportSection
      isLoading={isLoading}
      isError={isError}
      isEmpty={!report || report.rows.length === 0}
      isPlaceholderData={isPlaceholderData}
      isProvisional={Boolean(report?.isProvisional)}
      emptyTitle="Nobody to show for this range"
      emptyDescription="Once people join your teams, their hours appear here."
      onRetry={refetch}
    >
      {report && (
        <PeopleReportTable
          rows={report.rows}
          totals={report.totals}
          periodText={periodText}
        />
      )}
    </ReportSection>
  );
};
