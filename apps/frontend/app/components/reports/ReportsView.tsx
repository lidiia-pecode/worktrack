"use client";

import { ReactNode, useState } from "react";
import { Activity, Building2, FolderKanban, Users } from "lucide-react";

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

import {
  ResourceTabButton,
  ResourceTabList,
} from "../shared/resource/ResourceTabs";
import { HoursExportButton } from "./components/HoursExportButton";
import { HoursReportSection } from "./components/HoursReportSection";
import { HoursTableGrouping } from "./components/HoursReportTable";
import { PeopleReportSection } from "./components/PeopleReportSection";
import { ReportPeriodPicker } from "./components/ReportPeriodPicker";

export type ReportTab = "projects" | "clients" | "people" | "activities";

const REPORT_PANEL_ID = "report-panel";
const reportTabId = (tab: ReportTab) => `report-tab-${tab}`;

const TABS: { tab: ReportTab; label: string; icon: ReactNode }[] = [
  {
    tab: "projects",
    label: "Projects",
    icon: <FolderKanban className="size-3.5" />,
  },
  {
    tab: "clients",
    label: "Clients",
    icon: <Building2 className="size-3.5" />,
  },
  { tab: "people", label: "People", icon: <Users className="size-3.5" /> },
  {
    tab: "activities",
    label: "Activities",
    icon: <Activity className="size-3.5" />,
  },
];

const HOURS_GROUPING: Record<
  Exclude<ReportTab, "people">,
  HoursTableGrouping
> = {
  projects: HoursReportGroupBy.PROJECT,
  clients: HoursReportGroupBy.CLIENT,
  activities: HoursReportGroupBy.ACTIVITY,
};

// The tabs list different rows by design: a project or client needs time or
// a plan, an activity needs time (plans have no activity), and the people tab
// measures everyone.
const LISTED: Record<ReportTab, string> = {
  projects: "Projects with logged or planned time in this period.",
  clients: "Clients with logged or planned time in this period.",
  people:
    "Everyone active, plus deactivated people with logged or planned time. Expected is their capacity minus time off.",
  activities:
    "Activities with logged time. Plans are made per project, so there is no plan here.",
};

/** What a tab lists, and for a manager that the figures cover only their teams. */
export const describeListedRows = (tab: ReportTab, isManager: boolean) =>
  isManager
    ? `${LISTED[tab]} Only you and the teams you lead are counted.`
    : LISTED[tab];

export const ReportsView = () => {
  const { company } = useCompany();
  const { user } = useAuth();

  const [tab, setTab] = useState<ReportTab>("projects");
  const [chosenPeriod, setChosenPeriod] = useState<ReportPeriod | null>(null);

  const currentMonth = toMonthKey(todayISODate(company?.timezone));
  const period = chosenPeriod ?? periodHolding("month", currentMonth);
  const range = periodRange(period);
  const rangeError = periodRangeError(period);
  const isRangeValid = !rangeError;
  const shownPeriod = periodText(period, currentMonth);

  // Every tab counts the same days, so the Hours report by project says for
  // all of them where the counting stopped, and whether there is time to
  // export.
  const { report: hoursReport, isPlaceholderData } = useHoursReport(
    { ...range, groupBy: HoursReportGroupBy.PROJECT },
    isRangeValid,
  );
  const hasHoursToExport = (hoursReport?.totals.totalMinutes ?? 0) > 0;
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

        {hasHoursToExport && (
          <HoursExportButton range={range} disabled={!isRangeValid} />
        )}
      </div>

      {isRangeValid && countedUntil && (
        <p className="pt-3 pb-1 text-xs text-muted-foreground">
          Figures up to {formatDayMonthLabel(countedUntil)} — today’s time is
          counted from tomorrow.
        </p>
      )}

      <ResourceTabList label="Report rows">
        {TABS.map(({ tab: shownTab, label, icon }) => (
          <ResourceTabButton
            key={shownTab}
            id={reportTabId(shownTab)}
            controls={REPORT_PANEL_ID}
            active={tab === shownTab}
            icon={icon}
            label={label}
            onClick={() => setTab(shownTab)}
          />
        ))}
      </ResourceTabList>

      <div
        role="tabpanel"
        id={REPORT_PANEL_ID}
        aria-labelledby={reportTabId(tab)}
      >
        <p className="px-3 py-3 text-xs text-muted-foreground">
          {describeListedRows(tab, user?.role === UserRole.MANAGER)}
        </p>

        {isRangeValid &&
          (tab === "people" ? (
            <PeopleReportSection range={range} periodText={shownPeriod} />
          ) : (
            <HoursReportSection
              range={range}
              groupBy={HOURS_GROUPING[tab]}
              periodText={shownPeriod}
            />
          ))}
      </div>
    </div>
  );
};
