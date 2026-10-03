"use client";

import { useState } from "react";
import { CalendarClock, FileBarChart, Gauge } from "lucide-react";

import { useHoursReport } from "@/hooks/useHoursReport";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import {
  getMonthRange,
  isISODate,
  lastDayOfReportRange,
  MAX_REPORT_RANGE_DAYS,
  toMonthKey,
  todayISODate,
} from "@/lib/utils/date";
import { HoursReportGroupBy } from "@/types/enums";

import {
  ResourceTabButton,
  ResourceTabList,
} from "../shared/resource/ResourcePage";
import { HoursExportButton } from "./components/HoursExportButton";
import { HoursReportSection } from "./components/HoursReportSection";
import { PlannedVsActualSection } from "./components/PlannedVsActualSection";
import {
  CUSTOM_RANGE,
  DateRange,
  ReportFilters,
} from "./components/ReportFilters";
import { UtilisationSection } from "./components/UtilisationSection";

type ReportTab = "hours" | "planned-vs-actual" | "utilisation";

const REPORT_PANEL_ID = "report-panel";
const reportTabId = (tab: ReportTab) => `report-tab-${tab}`;

const EMPTY_RANGE = { dateFrom: "", dateTo: "" };

export const getRangeError = ({ dateFrom, dateTo }: DateRange) => {
  if (!dateFrom || !dateTo) return "Pick both dates";
  if (!isISODate(dateFrom) || !isISODate(dateTo)) {
    return "Use a four-digit year";
  }
  if (dateFrom > dateTo) return "Must be on or after From";
  if (dateTo > lastDayOfReportRange(dateFrom)) {
    return `At most ${MAX_REPORT_RANGE_DAYS} days`;
  }
  return undefined;
};

export const ReportsView = () => {
  const { timezone } = useWorkSettings();

  const [tab, setTab] = useState<ReportTab>("hours");
  const [chosenPeriod, setChosenPeriod] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState(EMPTY_RANGE);
  const [groupBy, setGroupBy] = useState(HoursReportGroupBy.CLIENT);

  const period = chosenPeriod ?? toMonthKey(todayISODate(timezone));
  const range = period === CUSTOM_RANGE ? customRange : getMonthRange(period);
  const rangeError = getRangeError(range);
  const isRangeValid = !rangeError;

  const { report: hoursReport } = useHoursReport(
    { ...range, groupBy },
    isRangeValid && tab === "hours",
  );
  const hasHoursToExport = (hoursReport?.rows.length ?? 0) > 0;

  const changePeriod = (nextPeriod: string) => {
    if (nextPeriod === CUSTOM_RANGE && period !== CUSTOM_RANGE) {
      setCustomRange(getMonthRange(period));
    }

    setChosenPeriod(nextPeriod);
  };

  return (
    <div className="flex flex-col">
      <ResourceTabList label="Report">
        <ResourceTabButton
          id={reportTabId("hours")}
          controls={REPORT_PANEL_ID}
          active={tab === "hours"}
          icon={<FileBarChart className="size-3.5" />}
          label="Hours"
          onClick={() => setTab("hours")}
        />

        <ResourceTabButton
          id={reportTabId("planned-vs-actual")}
          controls={REPORT_PANEL_ID}
          active={tab === "planned-vs-actual"}
          icon={<CalendarClock className="size-3.5" />}
          label="Planned vs actual"
          onClick={() => setTab("planned-vs-actual")}
        />

        <ResourceTabButton
          id={reportTabId("utilisation")}
          controls={REPORT_PANEL_ID}
          active={tab === "utilisation"}
          icon={<Gauge className="size-3.5" />}
          label="Utilisation"
          onClick={() => setTab("utilisation")}
        />
      </ResourceTabList>

      <div
        role="tabpanel"
        id={REPORT_PANEL_ID}
        aria-labelledby={reportTabId(tab)}
      >
        <div className="border-b border-border">
          <ReportFilters
            period={period}
            customRange={customRange}
            rangeError={rangeError}
            onPeriodChange={changePeriod}
            onCustomRangeChange={setCustomRange}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            showGroupBy={tab === "hours"}
            actions={
              tab === "hours" &&
              hasHoursToExport && (
                <HoursExportButton range={range} disabled={!isRangeValid} />
              )
            }
          />
        </div>

        {isRangeValid && tab === "hours" && (
          <HoursReportSection range={range} groupBy={groupBy} />
        )}

        {isRangeValid && tab === "planned-vs-actual" && (
          <PlannedVsActualSection range={range} />
        )}

        {isRangeValid && tab === "utilisation" && (
          <UtilisationSection range={range} />
        )}
      </div>
    </div>
  );
};
