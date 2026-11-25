"use client";

import { useMemo, useState } from "react";
import { Lock, SearchX } from "lucide-react";

import { usePlanningGrid } from "@/hooks/usePlanning";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useAllProjectsQuery } from "@/hooks/useProjects";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { useLockedDates } from "@/hooks/useReportingPeriods";
import { useTeamOptions } from "@/hooks/useTeams";
import {
  addDays,
  addMonthsToKey,
  formatMonthLabel,
  formatReportHours,
  fromISODate,
  getMonthRange,
  getWeekDates,
  getWeekEnd,
  getWeekStart,
  isWeekend,
  shiftISODate,
  toISODate,
  toMonthKey,
  todayISODate,
} from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { combineQueryStates } from "@/lib/utils/query-states";
import {
  mapAbsencesByUserAndDate,
  newAbsenceStartDate,
} from "@/lib/utils/absence";
import {
  nextTeamSort,
  searchTeamRows,
  sortPlanningRows,
  TeamSortKey,
} from "@/lib/utils/team-rows";
import { lockLookupRange } from "@/lib/utils/reporting-period";
import { Absence, PlanningRow } from "@/types";
import { ProjectStatus, UserRole } from "@/types/enums";

import { Button } from "@/components/ui/button";
import {
  createTooltipHandle,
  Tooltip,
  TooltipContent,
} from "@/components/ui/tooltip";

import { EmptyState } from "../shared/EmptyState";
import { OnlyViewerNotice } from "../shared/week/OnlyViewerNotice";
import { onlyViewerReason } from "../shared/week/only-viewer";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { WeekTotal } from "../shared/week/WeekTotal";
import { BackToThisWeekButton, WeekNav } from "../shared/week/WeekNav";
import { BackToNowButton } from "../shared/buttons/BackToNowButton";
import { StepArrows } from "../shared/buttons/StepArrows";
import { SegmentedControl } from "../shared/SegmentedControl";
import { TeamFilters } from "../shared/week/TeamFilters";
import { useTeamTimeFilters } from "../shared/week/useTeamTimeFilters";
import { PersonAbsenceModal } from "../shared/absence/PersonAbsenceModal";
import { PlanPeriodModal } from "./components/PlanPeriodModal";
import { PlanningWeekRow } from "./components/PlanningWeekRow";
import { PlanningMonthRow } from "./components/PlanningMonthRow";
import { GridColumn, PeopleGridTable } from "../shared/week/PeopleGridTable";
import { monthWorkingWeeks, weekLabel } from "./month-weeks";
import { usePlanningPeriod } from "./usePlanningPeriod";

/** An absence opened from the week's grid, or a new one added from Plan a period. */
type AbsenceFormState = {
  user: PlanningRow["user"];
  /** The day a new absence starts on. */
  date: string;
  absence?: Absence;
};

type PlanningViewProps = {
  role: UserRole;
  viewerId: string;
};

const UNITS = [
  { value: "month" as const, label: "Month" },
  { value: "week" as const, label: "Week" },
];

/**
 * Planning: a month of the team's plans, which it opens on, or one week of
 * them, day by day. Both share the filters, the sort and the dialogs.
 */
export const PlanningView = ({ role, viewerId }: PlanningViewProps) => {
  const settings = useWorkSettings();
  const { weekStartDay, timezone } = settings;

  const {
    unit,
    weekStart,
    month,
    currentMonth,
    firstMonth,
    openWeek,
    openMonth,
  } = usePlanningPeriod();
  const isMonth = unit === "month";
  const {
    teamId,
    projectId: projectInAddress,
    search,
    sort,
    setFilters,
    setSearch,
    setSort,
    clearFilters,
  } = useTeamTimeFilters();
  const sortBy = (key: TeamSortKey) => setSort(nextTeamSort(sort, key));
  const [absenceForm, setAbsenceForm] = useState<AbsenceFormState | null>(null);
  const [periodUserId, setPeriodUserId] = useState<string | null>(null);
  // The month holds hundreds of days and bars, so they share one tooltip.
  const [tooltip] = useState(() => createTooltipHandle<string>());

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  // Plans go on working days only, so the grid shows only those; Team time
  // keeps the weekend, where time can be logged.
  const workingDates = useMemo(
    () => weekDates.filter((date) => !isWeekend(date)),
    [weekDates],
  );
  const monthWeeks = useMemo(
    () => monthWorkingWeeks(month, weekStartDay),
    [month, weekStartDay],
  );
  const monthRange = getMonthRange(month);
  const dateFrom = isMonth ? monthRange.dateFrom : toISODate(weekStart);
  const dateTo = isMonth ? monthRange.dateTo : toISODate(getWeekEnd(weekStart));
  const shownDates = useMemo(() => {
    const dates: string[] = [];
    for (let day = dateFrom; day <= dateTo; day = shiftISODate(day, 1)) {
      dates.push(day);
    }
    return dates;
  }, [dateFrom, dateTo]);

  const grid = usePlanningGrid(unit, { date: dateFrom, teamId });
  const { rows, isPlaceholderData: isShowingPreviousPeriod } = grid;

  const absenceList = useAllAbsencesQuery({
    dateFrom,
    dateTo,
    teamId,
  });
  const { items: absences } = absenceList;

  const absencesByUser = useMemo(
    () => mapAbsencesByUserAndDate(absences, shownDates),
    [absences, shownDates],
  );

  // An absence is frozen whole once any of its days locks, so its months count.
  const lockRange = lockLookupRange(
    dateFrom,
    dateTo,
    absences,
    todayISODate(timezone),
  );
  const locks = useLockedDates(lockRange.dateFrom, lockRange.dateTo);
  const { isLocked } = locks;

  // The same list the project filter shows, so it comes from the cache.
  const { items: projects } = useAllProjectsQuery();
  // Planning offers active projects only, so a link to one archived since
  // filters nothing here, rather than by a project the filter can't show.
  const projectId = projects.some(
    (project) =>
      project.id === projectInAddress &&
      project.status !== ProjectStatus.ACTIVE,
  )
    ? undefined
    : projectInAddress;
  // Set whenever a project filters the grid, even before its name has loaded.
  const projectName = projectId
    ? (projects.find((project) => project.id === projectId)?.name ??
      "this project")
    : undefined;

  // Under a project filter: the people on it, or with a plan on it, each row
  // holding that project's plans only, as Team time's rows do; then the
  // search, as there. The dialogs keep opening on the full row.
  const shownRows = useMemo(() => {
    const onProject = projectId
      ? rows
          .filter(
            (row) =>
              row.projects.some((project) => project.id === projectId) ||
              row.entries.some((entry) => entry.project.id === projectId),
          )
          .map((row) => {
            const entries = row.entries.filter(
              (entry) => entry.project.id === projectId,
            );
            const plannedMinutes = entries.reduce(
              (sum, entry) => sum + entry.plannedMinutes,
              0,
            );
            return { ...row, entries, plannedMinutes };
          })
      : rows;

    return sortPlanningRows(searchTeamRows(onProject, search), sort, {
      byProject: Boolean(projectId),
    });
  }, [rows, projectId, search, sort]);

  const hasActiveFilters = Boolean(teamId ?? projectId);
  const isSearching = Boolean(search.trim());
  const matchesNobody =
    (hasActiveFilters || isSearching) && shownRows.length === 0;

  const totalPlanned = shownRows.reduce(
    (sum, row) => sum + row.plannedMinutes,
    0,
  );
  const totalAvailable = shownRows.reduce(
    (sum, row) => sum + row.availableMinutes,
    0,
  );

  const periodRow = periodUserId
    ? rows.find((row) => row.user.id === periodUserId)
    : undefined;

  const todayIso = todayISODate(timezone);
  const isMonthLocked = monthWeeks
    .flat()
    .every((date) => isLocked(toISODate(date)));
  // Plan a period from the month opens on it; its Week button goes to this
  // week when the month holds today, or else to the month's first week. The
  // dialog gets the whole working week, not the month's part of it, so its
  // arrows step through full weeks.
  const periodMonthWeek =
    monthWeeks.find((week) =>
      week.some((date) => toISODate(date) === todayIso),
    ) ?? monthWeeks[0];
  const periodWeekDates = isMonth
    ? getWeekDates(getWeekStart(periodMonthWeek[0], weekStartDay)).filter(
        (date) => !isWeekend(date),
      )
    : workingDates;
  const pickUnit = (next: "week" | "month") => {
    if (next === unit) return;
    if (next === "week") {
      openWeek(
        month === toMonthKey(todayIso)
          ? fromISODate(todayIso)
          : monthWeeks[0][0],
      );
    } else {
      // The month holding most of the week: its fourth day's.
      openMonth(toMonthKey(toISODate(addDays(weekStart, 3))));
    }
  };
  const periodWord = isMonth ? "month" : "week";

  const monthColumns: GridColumn[] = monthWeeks.map((week) => ({
    key: toISODate(week[0]),
    // Wide by the days they hold, a short edge week still wide enough for
    // its hours.
    width: `${Math.max(week.length, 2.5) * 1.5}rem`,
    headingClassName: "p-2 text-left",
    heading: (
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span
          className={cn(
            "text-xs font-semibold text-foreground",
            week.some((date) => toISODate(date) === todayIso) &&
              "mark-current-under",
          )}
        >
          {weekLabel(week)}
        </span>

        {week.every((date) => isLocked(toISODate(date))) && (
          <Lock className="size-3 text-muted-foreground" aria-label="Locked" />
        )}
      </span>
    ),
  }));
  const weekColumns: GridColumn[] = workingDates.map((date) => ({
    key: toISODate(date),
    width: "7rem",
    headingClassName: "p-0",
    heading: (
      <WeekHeaderDay
        date={date}
        isToday={toISODate(date) === todayIso}
        isLocked={isLocked(toISODate(date))}
      />
    ),
  }));

  // The locks too, so no day shows before it is known whether it can change.
  // The toolbar stays meanwhile, as on every page with a period.
  const { isLoading, hasError, retry } = combineQueryStates([
    settings,
    grid,
    absenceList,
    locks,
  ]);

  const {
    options: teamOptions,
    isLoading: isLoadingTeams,
    isError: isTeamsError,
  } = useTeamOptions();
  const onlyViewerFromRows = onlyViewerReason({
    role,
    viewerId,
    rowUserIds: rows.map((row) => row.user.id),
    hasActiveFilters,
    ledTeamCount: teamOptions.length,
  });
  const onlyViewer = isLoadingTeams || isTeamsError ? null : onlyViewerFromRows;

  const isReady = !isLoading && !hasError;

  return (
    // Fills the page, so an empty state stretches to the bottom.
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pr-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Show"
            size="sm"
            options={UNITS}
            value={unit}
            onChange={pickUnit}
          />

          {isMonth ? (
            <>
              <StepArrows
                unit="month"
                previousDisabled={
                  firstMonth !== undefined && month <= firstMonth
                }
                onPrevious={() => openMonth(addMonthsToKey(month, -1))}
                onNext={() => openMonth(addMonthsToKey(month, 1))}
              />
              <span className="px-1 text-sm font-medium whitespace-nowrap">
                {formatMonthLabel(month)}
              </span>
            </>
          ) : (
            <WeekNav weekStart={weekStart} onWeekChange={openWeek} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isMonth ? (
            month !== currentMonth && (
              <BackToNowButton
                label="Back to this month"
                onClick={() => openMonth(currentMonth)}
              />
            )
          ) : (
            <BackToThisWeekButton
              weekStart={weekStart}
              onWeekChange={openWeek}
            />
          )}

          {isReady && (
            <WeekTotal
              label="Planned"
              fill="planned"
              minutes={totalPlanned}
              formatHours={isMonth ? formatReportHours : undefined}
              // A project's plans have no available figure of their own.
              ofMinutes={projectId ? undefined : totalAvailable}
            />
          )}
        </div>
      </div>

      {!hasError && (
        <TeamFilters
          teamId={teamId}
          projectId={projectId}
          onTeamChange={(nextTeamId) => setFilters({ teamId: nextTeamId })}
          onProjectChange={(nextProjectId) =>
            setFilters({ projectId: nextProjectId })
          }
          activeProjectsOnly
          search={search}
          onSearchChange={setSearch}
        />
      )}

      {isLoading && !hasError && (
        <LoadingState
          title={`Loading the ${periodWord}'s plan`}
          description="Fetching planned work and company settings."
        />
      )}

      {hasError && (
        <ErrorState
          title={`We couldn't load the ${periodWord}'s plan`}
          description={`This ${periodWord} is unavailable right now.`}
          onRetry={retry}
        />
      )}

      {isReady && matchesNobody && (
        <EmptyState
          className="mt-3"
          icon={<SearchX />}
          title="Nobody matches"
          description="Nobody you can plan for matches the search, team or project you picked."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      )}

      {isReady && onlyViewer && (
        <div className="py-3 pr-3">
          <OnlyViewerNotice reason={onlyViewer} />
        </div>
      )}

      {isReady && shownRows.length > 0 && (
        <PeopleGridTable
          columns={isMonth ? monthColumns : weekColumns}
          totalLabel="Planned"
          className="min-w-4xl"
          sort={sort}
          onSort={sortBy}
          isStale={isShowingPreviousPeriod}
        >
          {shownRows.map((row) =>
            isMonth ? (
              <PlanningMonthRow
                key={row.user.id}
                row={row}
                weeks={monthWeeks}
                absencesByDate={absencesByUser[row.user.id] ?? {}}
                isMonthLocked={isMonthLocked}
                projectName={projectName}
                tooltip={tooltip}
                onOpenWeek={openWeek}
                onPlanPeriod={(opened) => setPeriodUserId(opened.user.id)}
              />
            ) : (
              <PlanningWeekRow
                key={row.user.id}
                row={row}
                weekDates={workingDates}
                absencesByDate={absencesByUser[row.user.id] ?? {}}
                isLocked={isLocked}
                projectName={projectName}
                tooltip={tooltip}
                onPlanPeriod={(opened) => setPeriodUserId(opened.user.id)}
                onAbsenceClick={(absence) =>
                  setAbsenceForm({
                    user: row.user,
                    date: absence.startDate,
                    absence,
                  })
                }
              />
            ),
          )}
        </PeopleGridTable>
      )}

      <Tooltip handle={tooltip}>
        {({ payload }) => <TooltipContent>{payload}</TooltipContent>}
      </Tooltip>

      {absenceForm && (
        <PersonAbsenceModal
          user={absenceForm.user}
          date={absenceForm.date}
          absence={absenceForm.absence}
          isLocked={isLocked}
          onClose={() => setAbsenceForm(null)}
        />
      )}

      {periodRow && (
        <PlanPeriodModal
          key={periodRow.user.id}
          row={periodRow}
          weekDates={periodWeekDates}
          month={isMonth ? month : undefined}
          // One day to start from, as on Team time: today when the period
          // holds it, otherwise the period's first working day.
          onAddAbsence={(startDate, endDate) =>
            setAbsenceForm({
              user: periodRow.user,
              date: newAbsenceStartDate({
                today: fromISODate(todayIso),
                weekStart: fromISODate(startDate),
                isCurrentWeek: startDate <= todayIso && todayIso <= endDate,
                isEditable: (date) => !isLocked(date),
              }),
            })
          }
          onClose={() => setPeriodUserId(null)}
        />
      )}
    </div>
  );
};
