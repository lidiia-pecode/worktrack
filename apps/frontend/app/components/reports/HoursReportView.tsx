"use client";

import { useState } from "react";
import { Clock, FileBarChart } from "lucide-react";

import { useHoursReport } from "@/hooks/useHoursReport";
import { getMonthRange, toMonthKey, todayISODate } from "@/lib/utils/date";
import { HoursReportGroupBy } from "@/types/enums";

import Container from "../layout/Container";
import { EmptyState } from "../shared/EmptyState";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import {
  CUSTOM_RANGE,
  HoursReportFilters,
} from "./components/HoursReportFilters";
import { HoursReportTable } from "./components/HoursReportTable";

export const HoursReportView = () => {
  const [period, setPeriod] = useState(() => toMonthKey(todayISODate()));
  const [customRange, setCustomRange] = useState(() =>
    getMonthRange(toMonthKey(todayISODate())),
  );
  const [groupBy, setGroupBy] = useState(HoursReportGroupBy.CLIENT);

  const range = period === CUSTOM_RANGE ? customRange : getMonthRange(period);
  const isRangeValid =
    Boolean(range.dateFrom && range.dateTo) && range.dateFrom <= range.dateTo;

  const { report, isLoading, isPlaceholderData, isError, refetch } =
    useHoursReport({ ...range, groupBy }, isRangeValid);

  // Switching to a custom range starts from the month that was showing.
  const changePeriod = (nextPeriod: string) => {
    if (nextPeriod === CUSTOM_RANGE && period !== CUSTOM_RANGE) {
      setCustomRange(getMonthRange(period));
    }

    setPeriod(nextPeriod);
  };

  const hasRows = Boolean(report && report.rows.length > 0);

  return (
    <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
      <div className="border-b border-border">
        <HoursReportFilters
          period={period}
          customRange={customRange}
          rangeError={isRangeValid ? undefined : "Must be on or after From"}
          groupBy={groupBy}
          onPeriodChange={changePeriod}
          onCustomRangeChange={setCustomRange}
          onGroupByChange={setGroupBy}
        />

        {report?.isProvisional && (
          <p className="flex items-center gap-1.5 px-3 pb-3 text-xs text-muted-foreground">
            <Clock className="size-3.5 text-warning" aria-hidden />
            Provisional: some days in this range can still be edited, so these
            figures may change.
          </p>
        )}
      </div>

      {isRangeValid && isLoading && (
        <LoadingState
          title="Loading the report"
          description="Adding up logged time for this range."
        />
      )}

      {isRangeValid && isError && (
        <ErrorState
          title="We couldn't load the report"
          description="Logged time for this range is unavailable right now."
          onRetry={refetch}
        />
      )}

      {isRangeValid && report && !isError && !hasRows && (
        <div className="p-6">
          <EmptyState
            title="No time logged in this range"
            description="Pick another period, or check that people have logged their time."
            icon={<FileBarChart />}
          />
        </div>
      )}

      {isRangeValid && report && !isError && hasRows && (
        <div
          className={isPlaceholderData ? "opacity-60 transition-opacity" : ""}
          aria-busy={isPlaceholderData}
        >
          <HoursReportTable
            groupBy={groupBy}
            rows={report.rows}
            totals={report.totals}
          />
        </div>
      )}
    </Container>
  );
};
