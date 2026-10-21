"use client";

import { useState } from "react";
import { CalendarClock, FileBarChart, Gauge } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useCompany } from "@/hooks/auth/useCompany";
import { useHoursReport } from "@/hooks/useHoursReport";
import {
  formatDayMonthLabel,
  todayISODate,
  toMonthKey,
} from "@/lib/utils/date";
import { companyFirstMonth } from "@/lib/utils/reporting-period";
import {
  periodHolding,
  periodRange,
  periodRangeError,
  periodText,
  ReportPeriod,
} from "@/lib/utils/report-period";
import { HoursReportGroupBy, UserRole } from "@/types/enums";

import { FormSelect } from "../shared/FormSelect";
import {
  ResourceTabButton,
  ResourceTabList,
} from "../shared/resource/ResourceTabs";
import { HoursExportButton } from "./components/HoursExportButton";
import { HoursReportSection } from "./components/HoursReportSection";
import { PlannedVsActualSection } from "./components/PlannedVsActualSection";
import { ReportPeriodPicker } from "./components/ReportPeriodPicker";
import { UtilisationSection } from "./components/UtilisationSection";

export type ReportTab = "hours" | "planned-vs-actual" | "utilisation";

const REPORT_PANEL_ID = "report-panel";
const reportTabId = (tab: ReportTab) => `report-tab-${tab}`;

const GROUP_BY_OPTIONS = [
  { value: HoursReportGroupBy.CLIENT, label: "Client" },
  { value: HoursReportGroupBy.PROJECT, label: "Project" },
  { value: HoursReportGroupBy.ACTIVITY, label: "Activity" },
  { value: HoursReportGroupBy.PERSON, label: "Person" },
];

// The tabs list different people by design: time needs somebody who logged
// it, a gap needs a plan or time, and utilisation measures everyone.
const LISTED_PEOPLE: Record<ReportTab, string> = {
  hours: "People with logged time in this period.",
  "planned-vs-actual": "People with a plan or logged time in this period.",
  utilisation:
    "Everyone active, plus deactivated people with logged time. “—” means there was nothing to measure.",
};

/** Who a tab lists, and for a manager that the figures cover only their teams. */
export const describeListedPeople = (tab: ReportTab, isManager: boolean) =>
  isManager
    ? `${LISTED_PEOPLE[tab]} Only you and the teams you lead are counted.`
    : LISTED_PEOPLE[tab];

export const ReportsView = () => {
  const { company } = useCompany();
  const { user } = useAuth();

  const [tab, setTab] = useState<ReportTab>("hours");
  const [chosenPeriod, setChosenPeriod] = useState<ReportPeriod | null>(null);
  const [groupBy, setGroupBy] = useState(HoursReportGroupBy.CLIENT);

  const currentMonth = toMonthKey(todayISODate(company?.timezone));
  const period = chosenPeriod ?? periodHolding("month", currentMonth);
  const range = periodRange(period);
  const rangeError = periodRangeError(period);
  const isRangeValid = !rangeError;
  const shownPeriod = periodText(period, currentMonth);

  // Every tab counts the same days, so the Hours report says for all of them
  // where the counting stopped.
  const { report: hoursReport, isPlaceholderData } = useHoursReport(
    { ...range, groupBy },
    isRangeValid,
  );
  const hasHoursToExport = (hoursReport?.rows.length ?? 0) > 0;
  const countedUntil = isPlaceholderData ? null : hoursReport?.countedUntil;

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pr-3 pb-3">
        <ReportPeriodPicker
          period={period}
          currentMonth={currentMonth}
          companyFirstMonth={company ? companyFirstMonth(company) : undefined}
          error={rangeError}
          onChange={setChosenPeriod}
        />

        {tab === "hours" && hasHoursToExport && (
          <HoursExportButton range={range} disabled={!isRangeValid} />
        )}
      </div>

      {isRangeValid && countedUntil && (
        <p className="pt-3 pb-1 text-xs text-muted-foreground">
          Figures up to {formatDayMonthLabel(countedUntil)} — today’s time is
          counted from tomorrow.
        </p>
      )}

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
        <div className="flex flex-col gap-3 border-b border-border px-3 py-3 sm:flex-row sm:items-end sm:justify-between">
          {tab === "hours" && (
            <FormSelect
              label="Group by"
              className="sm:w-44"
              value={groupBy}
              options={GROUP_BY_OPTIONS}
              onValueChange={(value) => setGroupBy(value as HoursReportGroupBy)}
            />
          )}

          <p className="text-xs text-muted-foreground sm:ml-auto">
            {describeListedPeople(tab, user?.role === UserRole.MANAGER)}
          </p>
        </div>

        {isRangeValid && tab === "hours" && (
          <HoursReportSection
            range={range}
            groupBy={groupBy}
            periodText={shownPeriod}
          />
        )}

        {isRangeValid && tab === "planned-vs-actual" && (
          <PlannedVsActualSection range={range} periodText={shownPeriod} />
        )}

        {isRangeValid && tab === "utilisation" && (
          <UtilisationSection range={range} periodText={shownPeriod} />
        )}
      </div>
    </div>
  );
};
