"use client";

import { useState } from "react";
import { Clock, FileBarChart } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useCompany } from "@/hooks/auth/useCompany";
import { useHoursReport } from "@/hooks/useHoursReport";
import { usePeopleReport } from "@/hooks/usePeopleReport";
import { cn } from "@/lib/utils/cn";
import { attentionItems } from "@/lib/utils/report-attention";
import { formatDateRange, todayISODate, toMonthKey } from "@/lib/utils/date";
import { companyFirstMonth } from "@/lib/utils/reporting-period";
import {
  DateRange,
  periodHolding,
  periodRange,
  periodRangeError,
  ReportPeriod,
} from "@/lib/utils/report-period";
import { HoursReportGroupBy, UserRole } from "@/types/enums";

import { Badge } from "@/components/ui/badge";

import { EmptyState } from "../shared/EmptyState";
import { useOpenedEntry } from "../shared/useOpenedEntry";
import { PERSON_PARAM } from "../team/useOpenedPerson";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { HoursExportButton } from "./components/HoursExportButton";
import { ProjectsCard } from "./components/ProjectsCard";
import { ReportCharts } from "./components/ReportCharts";
import { PersonPanel, ProjectPanel } from "./components/ReportPanels";
import { ReportPeriodPicker } from "./components/ReportPeriodPicker";
import { ReportTiles } from "./components/ReportTiles";
import { TeamCard } from "./components/TeamCard";
import { WorthALook } from "./components/WorthALook";

const PROJECT_PARAM = "project";
// Until the company loads, a day without time weighs as a common working day.
const DEFAULT_DAY_HOURS = 8;
const PANEL_PARAMS = [PERSON_PARAM, PROJECT_PARAM] as const;

type ReportScopeProps = {
  range: DateRange;
  countedUntil: string | null;
  isProvisional: boolean;
  isManager: boolean;
};

/** Which days the figures cover, and whose. */
const ReportScope = ({
  range,
  countedUntil,
  isProvisional,
  isManager,
}: ReportScopeProps) => {
  const parts = [
    formatDateRange(range.dateFrom, countedUntil ?? range.dateTo),
    countedUntil && "today’s time counts from tomorrow",
    isManager && "your teams only",
  ].filter(Boolean);

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      {parts.join(" · ")}
      {isProvisional && (
        <Badge
          variant="neutral"
          title="Some days in this period can still be edited, so these figures may change."
        >
          <Clock className="size-3" aria-hidden />
          Provisional
          <span className="sr-only">
            : some days in this period can still be edited, so these figures may
            change
          </span>
        </Badge>
      )}
    </p>
  );
};

export const ReportsView = () => {
  const { company } = useCompany();
  const { user } = useAuth();

  const [chosenPeriod, setChosenPeriod] = useState<ReportPeriod | null>(null);
  const { opened, open, close } = useOpenedEntry(PANEL_PARAMS);
  const openPerson = (userId: string) => open(PERSON_PARAM, userId);
  const openProject = (projectId: string) => open(PROJECT_PARAM, projectId);

  const currentMonth = toMonthKey(todayISODate(company?.timezone));
  const period = chosenPeriod ?? periodHolding("month", currentMonth);
  const range = periodRange(period);
  const rangeError = periodRangeError(period);
  const isRangeValid = !rangeError;

  const people = usePeopleReport(range, isRangeValid);
  const projects = useHoursReport(
    { ...range, groupBy: HoursReportGroupBy.PROJECT },
    isRangeValid,
  );
  const isUpdating = people.isPlaceholderData || projects.isPlaceholderData;
  const peopleReport = isRangeValid && !isUpdating ? people.report : null;
  // Only finished days count, so a period starting today has nothing yet.
  const isNothingCounted = Boolean(
    peopleReport?.countedUntil && peopleReport.countedUntil < range.dateFrom,
  );

  const renderOverview = () => {
    if (people.isLoading || projects.isLoading) {
      return (
        <LoadingState
          title="Loading the report"
          description="Adding up the time for this period."
        />
      );
    }

    if (people.isError || projects.isError) {
      return (
        <ErrorState
          title="We couldn't load the report"
          description="The figures for this period are unavailable right now."
          onRetry={() => {
            void people.refetch();
            void projects.refetch();
          }}
        />
      );
    }

    if (!people.report || !projects.report) return null;

    if (isNothingCounted) {
      return (
        <EmptyState
          title="Nothing counted yet"
          description="Only finished days count, so this period's figures start tomorrow."
          icon={<FileBarChart />}
        />
      );
    }

    const { totals } = people.report;
    if (totals.loggedMinutes === 0 && totals.plannedMinutes === 0) {
      return (
        <EmptyState
          title="Nothing logged or planned in this period"
          description="Pick another period, or check that people have logged their time."
          icon={<FileBarChart />}
        />
      );
    }

    return (
      // A container, so the cards follow the room beside an open panel, not the window.
      <div
        className={cn(
          "@container",
          isUpdating && "opacity-60 transition-opacity",
        )}
        aria-busy={isUpdating}
      >
        <ReportTiles totals={totals} projects={projects.report.rows} />
        <div className="mt-4">
          <WorthALook
            items={attentionItems(
              people.report.rows,
              projects.report.rows,
              (company?.standardWorkHoursPerDay ?? DEFAULT_DAY_HOURS) * 60,
            )}
            onOpenPerson={openPerson}
            onOpenProject={openProject}
          />
        </div>
        <div className="mt-4 grid items-start gap-4 @5xl:grid-cols-2">
          <TeamCard people={people.report.rows} onOpenPerson={openPerson} />
          <ProjectsCard
            projects={projects.report.rows}
            onOpenProject={openProject}
          />
        </div>
        <div className="mt-4">
          <ReportCharts range={range} />
        </div>
      </div>
    );
  };

  // A panel opens from the rows on screen, so a link to someone outside them
  // shows nothing.
  const renderPanel = () => {
    if (!opened || !people.report || !projects.report) return null;

    if (opened.param === PERSON_PARAM) {
      const person = people.report.rows.find((row) => row.userId === opened.id);
      return (
        person && (
          <PersonPanel
            key={person.userId}
            person={person}
            range={range}
            countedUntil={people.report.countedUntil}
            onClose={close}
          />
        )
      );
    }

    const project = projects.report.rows.find((row) => row.id === opened.id);
    return (
      project && (
        <ProjectPanel
          key={project.id}
          project={project}
          range={range}
          onClose={close}
        />
      )
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <ReportPeriodPicker
            period={period}
            currentMonth={currentMonth}
            companyFirstMonth={company ? companyFirstMonth(company) : undefined}
            error={rangeError}
            onChange={setChosenPeriod}
          />
          {peopleReport && !isNothingCounted && (
            <ReportScope
              range={range}
              countedUntil={peopleReport.countedUntil}
              isProvisional={peopleReport.isProvisional}
              isManager={user?.role === UserRole.MANAGER}
            />
          )}
        </div>

        {(peopleReport?.totals.loggedMinutes ?? 0) > 0 && (
          <HoursExportButton range={range} disabled={!isRangeValid} />
        )}
      </div>

      {isRangeValid && renderOverview()}

      {renderPanel()}
    </div>
  );
};
