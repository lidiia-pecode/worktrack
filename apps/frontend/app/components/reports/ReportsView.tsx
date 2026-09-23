"use client";

import { useState } from "react";
import { CalendarClock, FileBarChart } from "lucide-react";

import { getMonthRange, toMonthKey, todayISODate } from "@/lib/utils/date";
import { HoursReportGroupBy } from "@/types/enums";

import Container from "../layout/Container";
import { ResourceTabButton } from "../shared/resourse/ResourcePage";
import { HoursReportSection } from "./components/HoursReportSection";
import { PlannedVsActualSection } from "./components/PlannedVsActualSection";
import { CUSTOM_RANGE, ReportFilters } from "./components/ReportFilters";

type ReportTab = "hours" | "planned-vs-actual";

export const ReportsView = () => {
  const [tab, setTab] = useState<ReportTab>("hours");
  const [period, setPeriod] = useState(() => toMonthKey(todayISODate()));
  const [customRange, setCustomRange] = useState(() =>
    getMonthRange(toMonthKey(todayISODate())),
  );
  const [groupBy, setGroupBy] = useState(HoursReportGroupBy.CLIENT);

  const range = period === CUSTOM_RANGE ? customRange : getMonthRange(period);
  const isRangeValid =
    Boolean(range.dateFrom && range.dateTo) && range.dateFrom <= range.dateTo;

  // Switching to a custom range starts from the month that was showing.
  const changePeriod = (nextPeriod: string) => {
    if (nextPeriod === CUSTOM_RANGE && period !== CUSTOM_RANGE) {
      setCustomRange(getMonthRange(period));
    }

    setPeriod(nextPeriod);
  };

  return (
    <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
      <div
        role="tablist"
        aria-label="Report"
        className="flex items-center gap-1 border-b border-border"
      >
        <ResourceTabButton
          active={tab === "hours"}
          icon={<FileBarChart className="size-3.5" />}
          label="Hours"
          onClick={() => setTab("hours")}
        />

        <ResourceTabButton
          active={tab === "planned-vs-actual"}
          icon={<CalendarClock className="size-3.5" />}
          label="Planned vs actual"
          onClick={() => setTab("planned-vs-actual")}
        />
      </div>

      <div className="border-b border-border">
        <ReportFilters
          period={period}
          customRange={customRange}
          rangeError={isRangeValid ? undefined : "Must be on or after From"}
          onPeriodChange={changePeriod}
          onCustomRangeChange={setCustomRange}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          showGroupBy={tab === "hours"}
        />
      </div>

      {isRangeValid && tab === "hours" && (
        <HoursReportSection range={range} groupBy={groupBy} />
      )}

      {isRangeValid && tab === "planned-vs-actual" && (
        <PlannedVsActualSection range={range} />
      )}
    </Container>
  );
};
