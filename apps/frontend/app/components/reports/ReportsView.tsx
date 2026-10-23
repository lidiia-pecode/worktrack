"use client";

import { useEffect, useState } from "react";
import { FileBarChart } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useCompany } from "@/hooks/auth/useCompany";
import { useHoursReport } from "@/hooks/useHoursReport";
import { usePeopleReport } from "@/hooks/usePeopleReport";
import { cn } from "@/lib/utils/cn";
import { attentionFacts } from "@/lib/utils/report-attention";
import { getMonthRange, todayISODate, toMonthKey } from "@/lib/utils/date";
import { bucketLabel } from "@/lib/utils/report-charts";
import { companyFirstMonth } from "@/lib/utils/reporting-period";
import { DateRange } from "@/lib/utils/report-period";
import { HoursReportGroupBy, UserRole } from "@/types/enums";

import { Badge } from "@/components/ui/badge";

import { EmptyState } from "../shared/EmptyState";
import { useOpenedEntry } from "../shared/useOpenedEntry";
import { PERSON_PARAM } from "../team/useOpenedPerson";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { HoursExportButton } from "./components/HoursExportButton";
import { KindOfWork } from "./components/KindOfWork";
import { ProjectsCard } from "./components/ProjectsCard";
import { PersonPanel, ProjectPanel } from "./components/ReportPanels";
import { ReportMonthStepper } from "./components/ReportMonthStepper";
import { TeamCard } from "./components/TeamCard";
import { WeekByWeek } from "./components/WeekByWeek";
import { NeedsAttention } from "./components/NeedsAttention";

const PROJECT_PARAM = "project";
const PANEL_PARAMS = [PERSON_PARAM, PROJECT_PARAM] as const;

/** Brings a card into view by its heading's id. */
const scrollToSection = (headingId: string) =>
  document
    .getElementById(headingId)
    ?.closest("section")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });

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
    bucketLabel({ start: range.dateFrom, end: countedUntil ?? range.dateTo }),
    countedUntil && "today’s time counts tomorrow",
    isManager && "your teams",
  ].filter(Boolean);

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      {parts.join(" · ")}
      {isProvisional && (
        <Badge
          variant="neutral"
          title="Some days in this month can still be edited, so these figures may change."
        >
          Month still open
          <span className="sr-only">
            : some days can still be edited, so these figures may change
          </span>
        </Badge>
      )}
    </p>
  );
};

export const ReportsView = () => {
  const { company } = useCompany();
  const { user } = useAuth();

  const [chosenMonth, setChosenMonth] = useState<string | null>(null);
  const { opened, open, close } = useOpenedEntry(PANEL_PARAMS);
  const openPerson = (userId: string) => open(PERSON_PARAM, userId);
  const openProject = (projectId: string) => open(PROJECT_PARAM, projectId);

  const currentMonth = toMonthKey(todayISODate(company?.timezone));
  const month = chosenMonth ?? currentMonth;
  const range: DateRange = getMonthRange(month);

  const people = usePeopleReport(range);
  const projects = useHoursReport({
    ...range,
    groupBy: HoursReportGroupBy.PROJECT,
  });
  const isUpdating = people.isPlaceholderData || projects.isPlaceholderData;
  const peopleReport = isUpdating ? null : people.report;
  // Only finished days count, so a month starting today has nothing yet.
  const isNothingCounted = Boolean(
    peopleReport?.countedUntil && peopleReport.countedUntil < range.dateFrom,
  );

  const renderOverview = () => {
    if (people.isLoading || projects.isLoading) {
      return (
        <LoadingState
          title="Loading the report"
          description="Adding up the time for this month."
        />
      );
    }

    if (people.isError || projects.isError) {
      return (
        <ErrorState
          title="We couldn't load the report"
          description="The figures for this month are unavailable right now."
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
          description="Only finished days count, and none of this month has finished yet."
          icon={<FileBarChart />}
        />
      );
    }

    const { totals } = people.report;
    if (totals.loggedMinutes === 0 && totals.plannedMinutes === 0) {
      return (
        <EmptyState
          title="Nothing logged or planned in this month"
          description="Pick another month, or check that people have logged their time."
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
        <WeekByWeek range={range} totals={totals} />
        <div className="mt-4">
          <NeedsAttention
            facts={attentionFacts(people.report.rows, projects.report.rows)}
            onOpenPerson={openPerson}
            onOpenProject={openProject}
            onSeePeople={() => scrollToSection("report-team")}
            onSeeProjects={() => scrollToSection("report-projects")}
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
          <KindOfWork range={range} />
        </div>
      </div>
    );
  };

  const openedPerson =
    opened?.param === PERSON_PARAM
      ? people.report?.rows.find((row) => row.userId === opened.id)
      : undefined;
  const openedProject =
    opened?.param === PROJECT_PARAM
      ? projects.report?.rows.find((row) => row.id === opened.id)
      : undefined;
  // A panel opens from the rows on screen. When the month drops its person or
  // project, or a link names someone outside them, it closes, URL included,
  // as on Team time, rather than reopening by itself later.
  const isOpenedGone =
    !!opened &&
    !!peopleReport &&
    !!projects.report &&
    !openedPerson &&
    !openedProject;

  useEffect(() => {
    if (isOpenedGone) close();
  }, [isOpenedGone, close]);

  const renderPanel = () => {
    if (!people.report) return null;

    if (openedPerson) {
      return (
        <PersonPanel
          key={openedPerson.userId}
          person={openedPerson}
          range={range}
          countedUntil={people.report.countedUntil}
          isUpdating={isUpdating}
          onClose={close}
        />
      );
    }

    return (
      openedProject && (
        <ProjectPanel
          key={openedProject.id}
          project={openedProject}
          range={range}
          isUpdating={isUpdating}
          onClose={close}
        />
      )
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <ReportMonthStepper
            month={month}
            currentMonth={currentMonth}
            companyFirstMonth={company ? companyFirstMonth(company) : undefined}
            onChange={setChosenMonth}
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

        {/* The last figures keep the button in place while a month loads. */}
        {(people.report?.totals.loggedMinutes ?? 0) > 0 && (
          <HoursExportButton range={range} />
        )}
      </div>

      {renderOverview()}

      {renderPanel()}
    </div>
  );
};
