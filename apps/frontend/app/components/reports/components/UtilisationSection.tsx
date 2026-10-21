"use client";

import { useUtilisation } from "@/hooks/useUtilisation";
import { DateRange } from "@/lib/utils/report-period";

import { ReportSection } from "./ReportSection";
import { UtilisationTable } from "./UtilisationTable";

type UtilisationSectionProps = {
  range: DateRange;
  /** The period in words, for the table's label. */
  periodText: string;
};

export const UtilisationSection = ({
  range,
  periodText,
}: UtilisationSectionProps) => {
  const { report, isLoading, isPlaceholderData, isError, refetch } =
    useUtilisation(range);

  return (
    <ReportSection
      isLoading={isLoading}
      isError={isError}
      isEmpty={!report || report.rows.length === 0}
      isPlaceholderData={isPlaceholderData}
      isProvisional={Boolean(report?.isProvisional)}
      emptyTitle="Nobody to show for this range"
      emptyDescription="Once people join your teams, their utilisation appears here."
      onRetry={refetch}
    >
      {report && (
        <UtilisationTable
          rows={report.rows}
          totals={report.totals}
          periodText={periodText}
        />
      )}
    </ReportSection>
  );
};
