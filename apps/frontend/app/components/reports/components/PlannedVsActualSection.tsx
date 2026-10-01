"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
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
      emptyDescription="Pick another period, or plan your team's week."
      emptyAction={
        <Link
          href="/planning"
          className={buttonVariants({ variant: "secondary" })}
        >
          Open Planning
        </Link>
      }
      onRetry={refetch}
    >
      {report && (
        <PlannedVsActualTable rows={report.rows} totals={report.totals} />
      )}
    </ReportSection>
  );
};
