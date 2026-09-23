"use client";

import { usePlannedVsActual } from "@/hooks/usePlannedVsActual";

import { DateRange } from "./ReportFilters";
import { PlannedVsActualTable } from "./PlannedVsActualTable";
import { ReportSection } from "./ReportSection";

type PlannedVsActualSectionProps = {
  range: DateRange;
};

export const PlannedVsActualSection = ({
  range,
}: PlannedVsActualSectionProps) => {
  const { report, isLoading, isPlaceholderData, isError, refetch } =
    usePlannedVsActual(range);

  return (
    <ReportSection
      isLoading={isLoading}
      isError={isError}
      isEmpty={!report || report.rows.length === 0}
      isPlaceholderData={isPlaceholderData}
      isProvisional={Boolean(report?.isProvisional)}
      emptyTitle="Nothing planned or logged in this range"
      emptyDescription="Pick another period, or plan your team's week on the Planning page."
      onRetry={refetch}
    >
      {report && (
        <PlannedVsActualTable rows={report.rows} totals={report.totals} />
      )}
    </ReportSection>
  );
};
