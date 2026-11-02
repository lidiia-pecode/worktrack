"use client";

import { useEffect } from "react";
import { FileBarChart } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useHoursReport } from "@/hooks/useHoursReport";
import { usePeopleReport } from "@/hooks/usePeopleReport";
import { useReportOverview } from "@/hooks/useReportOverview";
import { useReportingPeriods } from "@/hooks/useReportingPeriods";
import { useShownPeriod } from "@/hooks/useShownPeriod";
import { cn } from "@/lib/utils/cn";
import { NO_ATTENTION, reportAttention } from "@/lib/utils/report-attention";
import { periodChange, reportScope } from "@/lib/utils/report-overview";
import {
  containsDate,
  isShowablePeriod,
  periodLabel,
  periodOf,
  stepPeriod,
} from "@/lib/utils/shown-period";
import { toMonthKey } from "@/lib/utils/date";
import {
  HoursReportGroupBy,
  ReportingMonthState,
  UserRole,
} from "@/types/enums";

import { Button } from "@/components/ui/button";

import { EmptyState } from "../shared/EmptyState";
import { useOpenedEntry } from "../shared/useOpenedEntry";
import { PERSON_PARAM } from "../team/team-links";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { HoursExportButton } from "./components/HoursExportButton";
import { PersonPanel, ProjectPanel } from "./components/ReportPanels";
import { ReportPeriodControl } from "./components/ReportPeriodControl";
import { PeriodOverview } from "./components/PeriodOverview";
import { WhereTheTimeWent } from "./components/WhereTheTimeWent";
import { NeedsAttention, OpenMonthLinks } from "./components/NeedsAttention";
import { PeopleCard } from "./components/PeopleCard";

const PROJECT_PARAM = "project";
const PANEL_PARAMS = [PERSON_PARAM, PROJECT_PARAM] as const;

export const ReportsView = () => {
  const { user } = useAuth();

  const { period, today, firstDay, showPeriod } = useShownPeriod();
  const { opened, open, close } = useOpenedEntry(PANEL_PARAMS);
  const openPerson = (userId: string) => open(PERSON_PARAM, userId);
  const openProject = (projectId: string) => open(PROJECT_PARAM, projectId);

  const { range } = period;
  const isMonth = period.unit === "month";
  const periodName = periodLabel(period);
  // Nothing happened before the company existed, so a year that began before
  // it is counted, like its chart, from the company's first month.
  const rangeSinceCompanyStart =
    firstDay && range.dateFrom < firstDay
      ? { ...range, dateFrom: firstDay }
      : range;
  const previousPeriod = stepPeriod(period, -1);

  const overview = useReportOverview(range);
  const people = overview.report?.people ?? null;
  // The period before, of the same kind, for each figure's change; none
  // before the company's first month.
  const isPreviousShowable = isShowablePeriod(previousPeriod, today, firstDay);
  const previous = usePeopleReport(previousPeriod.range, {
    enabled: isPreviousShowable,
  });
  const previousReport =
    isPreviousShowable && !previous.isPlaceholderData ? previous.report : null;
  const timeline = overview.report?.timeline ?? null;
  const projects = useHoursReport({
    ...range,
    groupBy: HoursReportGroupBy.PROJECT,
  });
  // A longer period links to its open months, each with its own Needs attention.
  const reportingMonths = useReportingPeriods(
    {
      from: toMonthKey(range.dateFrom),
      to: toMonthKey(range.dateTo < today ? range.dateTo : today),
    },
    { enabled: !isMonth },
  );
  const openMonths = reportingMonths.months
    .filter((month) => month.state !== ReportingMonthState.LOCKED)
    .map((month) => month.month)
    .sort();
  const isManager = user?.role === UserRole.MANAGER;
  const isUpdating = overview.isPlaceholderData || projects.isPlaceholderData;
  const peopleReport = isUpdating ? null : people;
  // Only finished days count, so a month starting today has nothing yet.
  const isNothingCounted = Boolean(
    peopleReport?.countedUntil && peopleReport.countedUntil < range.dateFrom,
  );

  // The current period starts empty, as a month does in its first days, so
  // its empty state offers the period before.
  const showPrevious =
    containsDate(range, today) && isPreviousShowable ? (
      <Button variant="secondary" onClick={() => showPeriod(previousPeriod)}>
        Show {periodLabel(previousPeriod)}
      </Button>
    ) : undefined;

  const renderOverview = () => {
    if (overview.isLoading || projects.isLoading) {
      return (
        <LoadingState
          title="Loading the report"
          description={`Adding up the time for ${periodName}.`}
        />
      );
    }

    if (overview.isError || projects.isError) {
      return (
        <ErrorState
          title="We couldn't load the report"
          description={`The figures for ${periodName} are unavailable right now.`}
          onRetry={() => {
            void overview.refetch();
            void projects.refetch();
          }}
        />
      );
    }

    if (!people || !timeline || !projects.report) return null;

    if (isNothingCounted) {
      return (
        <EmptyState
          title="Nothing counted yet"
          description={`Only finished days count, and none of ${periodName} has finished yet.`}
          icon={<FileBarChart />}
          action={showPrevious}
        />
      );
    }

    const { totals, isProvisional, countedUntil } = people;
    if (totals.loggedMinutes === 0 && totals.plannedMinutes === 0) {
      return (
        <EmptyState
          title={`Nothing logged or planned in ${periodName}`}
          description="Pick another period, or check that people have logged their time."
          icon={<FileBarChart />}
          action={showPrevious}
        />
      );
    }

    // A locked month is for reference only, so nothing is marked (Decision 34);
    // Needs attention reads one month at a time.
    const attention =
      isProvisional && isMonth
        ? reportAttention({
            people: people.rows,
            projects: projects.report.rows,
            countedUntil,
            isManager,
          })
        : NO_ATTENTION;

    return (
      // A container, so the cards follow the room beside an open panel, not the window.
      <div
        className={cn(
          "@container",
          isUpdating && "opacity-60 transition-opacity",
        )}
        aria-busy={isUpdating}
      >
        <PeriodOverview
          timeline={timeline}
          totals={totals}
          firstDay={firstDay}
          periodName={periodName}
          previousName={periodLabel(previousPeriod)}
          change={previousReport && periodChange(totals, previousReport.totals)}
        />
        {isProvisional && isMonth && (
          <div className="mt-4">
            <NeedsAttention
              facts={attention.facts}
              month={range.dateFrom}
              isMonthRunning={countedUntil !== null}
              onOpenPerson={openPerson}
              onOpenProject={openProject}
            />
          </div>
        )}
        {!isMonth && openMonths.length > 0 && (
          <div className="mt-4">
            <OpenMonthLinks
              months={openMonths}
              onOpenMonth={(month) =>
                showPeriod(periodOf("month", `${month}-01`))
              }
            />
          </div>
        )}
        <div className="mt-4 grid items-start gap-4 @5xl:grid-cols-[3fr_2fr]">
          <PeopleCard
            people={people.rows}
            marked={attention.people}
            onOpenPerson={openPerson}
          />
          <WhereTheTimeWent
            range={range}
            projects={projects.report.rows}
            marked={attention.projects}
            isManager={isManager}
            onOpenProject={openProject}
          />
        </div>
      </div>
    );
  };

  const openedPerson =
    opened?.param === PERSON_PARAM
      ? people?.rows.find((row) => row.userId === opened.id)
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
    if (!people) return null;

    if (openedPerson) {
      return (
        <PersonPanel
          key={openedPerson.userId}
          person={openedPerson}
          range={range}
          countedUntil={people.countedUntil}
          showsDays={timeline?.bucketSize === "week"}
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
    // Fills the page, so an empty state stretches to the bottom as on Log my time.
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <ReportPeriodControl
            period={period}
            today={today}
            firstDay={firstDay}
            onChange={showPeriod}
          />
          {/* One line high even while a period loads, so the header holds still and
              says nothing about the period before. */}
          <p className="min-h-5 text-sm text-muted-foreground">
            {peopleReport &&
              !isNothingCounted &&
              reportScope(
                peopleReport,
                isManager,
                isMonth ? undefined : rangeSinceCompanyStart,
              )}
          </p>
        </div>

        {/* The last figures keep the button in place while a period loads. */}
        {(people?.totals.loggedMinutes ?? 0) > 0 && (
          <HoursExportButton range={range} />
        )}
      </div>

      {renderOverview()}

      {renderPanel()}
    </div>
  );
};
