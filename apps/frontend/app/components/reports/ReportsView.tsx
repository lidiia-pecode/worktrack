"use client";

import { useState } from "react";
import { CalendarClock, FileBarChart, Gauge } from "lucide-react";

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

import Container from "../layout/Container";
import {
  ResourceTabButton,
  ResourceTabList,
} from "../shared/resourse/ResourcePage";
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

// Caught here so a range the server would refuse is never sent.
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
  // Null until the viewer picks one: the company's current month, which is
  // only known once the workspace time zone has loaded.
  const [chosenPeriod, setChosenPeriod] = useState<string | null>(null);
  const [customRange, setCustomRange] = useState(EMPTY_RANGE);
  const [groupBy, setGroupBy] = useState(HoursReportGroupBy.CLIENT);

  const period = chosenPeriod ?? toMonthKey(todayISODate(timezone));
  const range = period === CUSTOM_RANGE ? customRange : getMonthRange(period);
  const rangeError = getRangeError(range);
  const isRangeValid = !rangeError;

  // Switching to a custom range starts from the month that was showing.
  const changePeriod = (nextPeriod: string) => {
    if (nextPeriod === CUSTOM_RANGE && period !== CUSTOM_RANGE) {
      setCustomRange(getMonthRange(period));
    }

    setChosenPeriod(nextPeriod);
  };

  return (
    <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
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
    </Container>
  );
};
