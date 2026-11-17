"use client";

import { useMemo, useState } from "react";
import { Lock, SearchX } from "lucide-react";

import { usePlanningGrid } from "@/hooks/usePlanning";
import { useAbsencesMutations, useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useAllProjectsQuery } from "@/hooks/useProjects";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { useLockedDates } from "@/hooks/useReportingPeriods";
import { useTeamOptions } from "@/hooks/useTeams";
import {
  addDays,
  addMonthsToKey,
  formatDayMonthLabel,
  formatMonthLabel,
  formatReportHours,
  getMonthRange,
  getWeekDates,
  getWeekEnd,
  isWeekend,
  toISODate,
  toMonthKey,
  todayISODate,
} from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { mapAbsencesByUserAndDate } from "@/lib/utils/absence";
import { fullName } from "@/lib/utils/user";
import {
  nextTeamSort,
  searchTeamRows,
  sortPlanningRows,
  TeamSortKey,
} from "@/lib/utils/team-rows";
import { lockLookupRange } from "@/lib/utils/reporting-period";
import { PlanningRow } from "@/types";
import { ProjectStatus, UserRole } from "@/types/enums";

import { Button } from "@/components/ui/button";

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
import { TeamFilters } from "../team/components/TeamFilters";
import { SortableHeading } from "../team/components/SortableHeading";
import { useTeamTimeFilters } from "../team/useTeamTimeFilters";
import { AbsenceFormModal } from "../timesheet/components/AbsenceFormModal";
import { PlanPeriodModal } from "./components/PlanPeriodModal";
import { PlanningWeekRow } from "./components/PlanningWeekRow";
import { PlanningMonthRow } from "./components/PlanningMonthRow";
import { monthWorkingWeeks } from "./month-weeks";
import { usePlanningPeriod } from "./usePlanningPeriod";
import { STICKY_PERSON_CELL } from "../shared/week/sticky-column";

/** An absence added from Plan a period, on the days it was planning. */
type AbsenceFormState = {
  user: PlanningRow["user"];
  date: string;
  endDate: string;
};

type PlanningViewProps = {
  role: UserRole;
  viewerId: string;
};

const UNITS = [
  { value: "month" as const, label: "Month" },
  { value: "week" as const, label: "Week" },
];

/** "Nov 16–20", or "Nov 30" for a week of one day in the month. */
const weekLabel = (week: Date[]) => {
  const first = formatDayMonthLabel(toISODate(week[0]));
  return week.length === 1
    ? first
    : `${first}–${week[week.length - 1].getDate()}`;
};

/**
 * Planning: a month of the team's plans, which it opens on, or one week of
 * them, day by day. Both share the filters, the sort and the dialogs.
 */
export const PlanningView = ({ role, viewerId }: PlanningViewProps) => {
  const {
    weekStartDay,
    timezone,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useWorkSettings();

  const { unit, weekStart, month, currentMonth, openWeek, openMonth } =
    usePlanningPeriod();
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
  const ariaSort = sort.direction === "asc" ? "ascending" : "descending";
  const [absenceForm, setAbsenceForm] = useState<AbsenceFormState | null>(null);
  const [periodUserId, setPeriodUserId] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  // Plans go on working days only, so the grid shows only those; Team time
  // keeps the weekend, where time can be logged.
  const workingDates = useMemo(
    () => weekDates.filter((date) => !isWeekend(date)),
    [weekDates],
  );
  // The month's working days by week, for its columns and the period dialog.
  const monthWeeks = useMemo(
    () => monthWorkingWeeks(month, weekStartDay),
    [month, weekStartDay],
  );
  const monthRange = getMonthRange(month);
  const dateFrom = isMonth ? monthRange.dateFrom : toISODate(weekStart);
  const dateTo = isMonth ? monthRange.dateTo : toISODate(getWeekEnd(weekStart));
  const shownDates = useMemo(() => {
    const dates: string[] = [];
    for (let day = dateFrom; day <= dateTo;) {
      dates.push(day);
      day = toISODate(addDays(new Date(`${day}T00:00:00`), 1));
    }
    return dates;
  }, [dateFrom, dateTo]);

  const {
    rows,
    isLoading: isLoadingGrid,
    isPlaceholderData: isShowingPreviousPeriod,
    isError: isGridError,
    refetch: refetchGrid,
  } = usePlanningGrid(unit, { date: dateFrom, teamId });

  const {
    items: absences,
    isLoading: isLoadingAbsences,
    isError: isAbsencesError,
    refetch: refetchAbsences,
  } = useAllAbsencesQuery({
    dateFrom,
    dateTo,
    teamId,
  });

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
  const {
    isLocked,
    isLoading: isLoadingLocks,
    isError: isLocksError,
    refetch: refetchLocks,
  } = useLockedDates(lockRange.dateFrom, lockRange.dateTo);

  const absenceActions = useAbsencesMutations();

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
  // week when the month holds today, or else to the month's first week.
  const periodWeekDates = isMonth
    ? (monthWeeks.find((week) =>
        week.some((date) => toISODate(date) === todayIso),
      ) ??
      monthWeeks[0] ??
      workingDates)
    : workingDates;
  const pickUnit = (next: "week" | "month") => {
    if (next === unit) return;
    if (next === "week") {
      openWeek(
        month === toMonthKey(todayIso)
          ? new Date(`${todayIso}T00:00:00`)
          : (monthWeeks[0]?.[0] ?? new Date(`${dateFrom}T00:00:00`)),
      );
    } else {
      // The month holding most of the week: its fourth day's.
      openMonth(toMonthKey(toISODate(addDays(weekStart, 3))));
    }
  };
  const periodWord = isMonth ? "month" : "week";

  const hasError =
    isSettingsError || isGridError || isAbsencesError || isLocksError;

  const retry = () => {
    void refetchGrid();
    void refetchSettings();
    void refetchAbsences();
    void refetchLocks();
  };

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

  // The locks too, so no day shows before it is known whether it can change.
  // The toolbar stays meanwhile, as on every page with a period.
  const isLoading =
    isLoadingSettings || isLoadingGrid || isLoadingAbsences || isLoadingLocks;
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

      {isReady && shownRows.length > 0 && isMonth && (
        <div
          className={cn(
            "overflow-x-auto transition-opacity",
            isShowingPreviousPeriod && "opacity-60",
          )}
          aria-busy={isShowingPreviousPeriod}
        >
          <table className="w-full min-w-4xl table-fixed border-collapse">
            <colgroup>
              <col className="w-52" />

              {/* Wide by the days they hold, a short edge week still
                  wide enough for its hours. */}
              {monthWeeks.map((week) => (
                <col
                  key={toISODate(week[0])}
                  style={{ width: `${Math.max(week.length, 2.5) * 1.5}rem` }}
                />
              ))}

              <col className="w-32" />
            </colgroup>

            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th
                  scope="col"
                  aria-sort={sort.key === "name" ? ariaSort : undefined}
                  className={cn(STICKY_PERSON_CELL, "p-2 text-left")}
                >
                  <SortableHeading
                    label="Person"
                    sortKey="name"
                    sort={sort}
                    onSort={sortBy}
                  />
                </th>

                {monthWeeks.map((week) => (
                  <th
                    key={toISODate(week[0])}
                    scope="col"
                    className="border-r border-border/60 p-2 text-left"
                  >
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
                        <Lock
                          className="size-3 text-muted-foreground"
                          aria-label="Locked"
                        />
                      )}
                    </span>
                  </th>
                ))}

                <th
                  scope="col"
                  aria-sort={sort.key === "total" ? ariaSort : undefined}
                  className="p-2 pr-3"
                >
                  <SortableHeading
                    label="Planned"
                    sortKey="total"
                    sort={sort}
                    onSort={sortBy}
                    alignEnd
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              {shownRows.map((row) => (
                <PlanningMonthRow
                  key={row.user.id}
                  row={row}
                  weeks={monthWeeks}
                  weekLabels={monthWeeks.map(weekLabel)}
                  absencesByDate={absencesByUser[row.user.id] ?? {}}
                  isMonthLocked={isMonthLocked}
                  projectName={projectName}
                  onOpenWeek={openWeek}
                  onPlanPeriod={(opened) => setPeriodUserId(opened.user.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isReady && shownRows.length > 0 && !isMonth && (
        <div
          className={cn(
            "overflow-x-auto transition-opacity",
            isShowingPreviousPeriod && "opacity-60",
          )}
          aria-busy={isShowingPreviousPeriod}
        >
          <table className="w-full min-w-4xl table-fixed border-collapse">
            <colgroup>
              <col className="w-52" />

              {workingDates.map((date) => (
                <col key={toISODate(date)} className="w-28" />
              ))}

              <col className="w-32" />
            </colgroup>

            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th
                  scope="col"
                  aria-sort={sort.key === "name" ? ariaSort : undefined}
                  className={cn(STICKY_PERSON_CELL, "p-2 text-left")}
                >
                  <SortableHeading
                    label="Person"
                    sortKey="name"
                    sort={sort}
                    onSort={sortBy}
                  />
                </th>

                {workingDates.map((date) => (
                  <th
                    key={toISODate(date)}
                    scope="col"
                    className="border-r border-border/60 p-0"
                  >
                    <WeekHeaderDay
                      date={date}
                      isToday={toISODate(date) === todayIso}
                      isLocked={isLocked(toISODate(date))}
                    />
                  </th>
                ))}

                <th
                  scope="col"
                  aria-sort={sort.key === "total" ? ariaSort : undefined}
                  className="p-2 pr-3"
                >
                  <SortableHeading
                    label="Planned"
                    sortKey="total"
                    sort={sort}
                    onSort={sortBy}
                    alignEnd
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              {shownRows.map((row) => (
                <PlanningWeekRow
                  key={row.user.id}
                  row={row}
                  weekDates={workingDates}
                  absencesByDate={absencesByUser[row.user.id] ?? {}}
                  isLocked={isLocked}
                  projectName={projectName}
                  onPlanPeriod={(opened) => setPeriodUserId(opened.user.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {absenceForm && (
        <AbsenceFormModal
          open
          onClose={() => setAbsenceForm(null)}
          userId={absenceForm.user.id}
          subjectName={fullName(absenceForm.user)}
          date={absenceForm.date}
          endDate={absenceForm.endDate}
          isLocked={isLocked}
          onCreate={(payload) =>
            absenceActions.create.mutateAsync({
              ...payload,
              userId: absenceForm.user.id,
            })
          }
          onUpdate={(id, data) =>
            absenceActions.update.mutateAsync({ id, data })
          }
          onDelete={(id) => absenceActions.delete.mutateAsync(id)}
          isSaving={
            absenceActions.create.isPending || absenceActions.update.isPending
          }
          isDeleting={absenceActions.delete.isPending}
        />
      )}

      {periodRow && (
        <PlanPeriodModal
          key={periodRow.user.id}
          row={periodRow}
          weekDates={periodWeekDates}
          month={isMonth ? month : undefined}
          onAddAbsence={(startDate, endDate) =>
            setAbsenceForm({
              user: periodRow.user,
              date: startDate,
              endDate,
            })
          }
          onClose={() => setPeriodUserId(null)}
        />
      )}
    </div>
  );
};
