"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";

import { usePlanningWeek } from "@/hooks/usePlanning";
import { useAbsencesMutations, useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useAllProjectsQuery } from "@/hooks/useProjects";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { useShownWeek } from "@/hooks/useShownWeek";
import { useLockedDates } from "@/hooks/useReportingPeriods";
import { useTeamOptions } from "@/hooks/useTeams";
import {
  getWeekDates,
  getWeekEnd,
  isWeekend,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { mapAbsencesByUserAndDate } from "@/lib/utils/absence";
import { fullName } from "@/lib/utils/user";
import { searchTeamRows } from "@/lib/utils/team-rows";
import { isRangeLocked, lockLookupRange } from "@/lib/utils/reporting-period";
import { Absence, PlanningWeekRow as PlanningRow } from "@/types";
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
import { TeamFilters } from "../team/components/TeamFilters";
import { useTeamTimeFilters } from "../team/useTeamTimeFilters";
import {
  absenceInAnotherTeam,
  AbsenceFormModal,
  LockedAbsenceModal,
} from "../timesheet/components/AbsenceFormModal";
import { PlanningDayModal } from "./components/PlanningDayModal";
import { PlanPeriodModal } from "./components/PlanPeriodModal";
import { PlanningWeekRow } from "./components/PlanningWeekRow";
import { STICKY_PERSON_CELL } from "../shared/week/sticky-column";

type OpenedDay = {
  userId: string;
  date: string;
};

type AbsenceFormState = {
  user: PlanningRow["user"];
  date: string;
  /** The last day of a period's absence; a day's absence has none. */
  endDate?: string;
  absence?: Absence;
};

type PlanningWeekViewProps = {
  role: UserRole;
  viewerId: string;
};

export const PlanningWeekView = ({ role, viewerId }: PlanningWeekViewProps) => {
  const {
    timezone,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useWorkSettings();

  const { weekStart, showWeekOf } = useShownWeek();
  const {
    teamId,
    projectId: projectInAddress,
    search,
    setFilters,
    setSearch,
    clearFilters,
  } = useTeamTimeFilters();
  const [openedDay, setOpenedDay] = useState<OpenedDay | null>(null);
  const [absenceForm, setAbsenceForm] = useState<AbsenceFormState | null>(null);
  const [readOnlyAbsence, setReadOnlyAbsence] = useState<{
    absence: Absence;
    row: PlanningRow;
  } | null>(null);
  const [periodUserId, setPeriodUserId] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  // Plans go on working days only, so the grid shows only those; Team time
  // keeps the weekend, where time can be logged.
  const workingDates = useMemo(
    () => weekDates.filter((date) => !isWeekend(date)),
    [weekDates],
  );
  const dateFrom = toISODate(weekStart);
  const dateTo = toISODate(getWeekEnd(weekStart));

  const {
    rows,
    isLoading: isLoadingWeek,
    isPlaceholderData: isShowingPreviousWeek,
    isError: isWeekError,
    refetch: refetchWeek,
  } = usePlanningWeek({ date: toISODate(weekStart), teamId });

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
    () => mapAbsencesByUserAndDate(absences, weekDates.map(toISODate)),
    [absences, weekDates],
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
    isEditable,
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

    return searchTeamRows(onProject, search);
  }, [rows, projectId, search]);

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

  const openedRow = openedDay
    ? rows.find((row) => row.user.id === openedDay.userId)
    : undefined;
  const openedAbsence = openedDay
    ? absencesByUser[openedDay.userId]?.[openedDay.date]
    : undefined;

  // An absence day opens the absence itself, unless a locked month freezes
  // it; then the day dialog shows it and says so. One the API says the viewer
  // can't change (some of its days are another team's) opens to be read only.
  const openDay = (row: PlanningRow, date: string) => {
    const absence = absencesByUser[row.user.id]?.[date];
    const isFrozen =
      !!absence && isRangeLocked(isLocked, absence.startDate, absence.endDate);

    if (absence && !isFrozen && absence.canChange === false) {
      setReadOnlyAbsence({ absence, row });
    } else if (absence && !isFrozen) {
      setAbsenceForm({ user: row.user, date: absence.startDate, absence });
    } else {
      setOpenedDay({ userId: row.user.id, date });
    }
  };
  const periodRow = periodUserId
    ? rows.find((row) => row.user.id === periodUserId)
    : undefined;

  const todayIso = todayISODate(timezone);
  const hasError =
    isSettingsError || isWeekError || isAbsencesError || isLocksError;

  const retry = () => {
    void refetchWeek();
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
    isLoadingSettings || isLoadingWeek || isLoadingAbsences || isLoadingLocks;
  const isReady = !isLoading && !hasError;

  return (
    // Fills the page, so an empty state stretches to the bottom.
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pr-3 pb-3">
        <WeekNav weekStart={weekStart} onWeekChange={showWeekOf} />

        <div className="flex flex-wrap items-center gap-3">
          <BackToThisWeekButton
            weekStart={weekStart}
            onWeekChange={showWeekOf}
          />

          {isReady && (
            <WeekTotal
              label="Planned"
              fill="planned"
              minutes={totalPlanned}
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
          onClear={clearFilters}
        />
      )}

      {isLoading && !hasError && (
        <LoadingState
          title="Loading the week's plan"
          description="Fetching planned work and company settings."
        />
      )}

      {hasError && (
        <ErrorState
          title="We couldn't load the week's plan"
          description="This week is unavailable right now."
          onRetry={retry}
        />
      )}

      {isReady && matchesNobody && (
        <EmptyState
          className="mt-3"
          icon={<SearchX />}
          title="Nobody matches these filters"
          description="Nobody you can plan for matches the team, project or search you picked."
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
        <div
          className={[
            "overflow-x-auto transition-opacity",
            isShowingPreviousWeek && "opacity-60",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-busy={isShowingPreviousWeek}
        >
          <table className="w-full min-w-4xl table-fixed border-collapse">
            <colgroup>
              <col className="w-56" />

              {workingDates.map((date) => (
                <col key={toISODate(date)} className="w-28" />
              ))}

              <col className="w-32" />
            </colgroup>

            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th
                  scope="col"
                  className={cn(
                    STICKY_PERSON_CELL,
                    "p-2 text-left text-2xs font-medium uppercase tracking-wider text-muted-foreground",
                  )}
                >
                  Person
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
                  className="p-2 pr-4 text-right text-2xs whitespace-nowrap uppercase tracking-wider text-muted-foreground"
                >
                  Planned
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
                  isEditable={isEditable}
                  projectName={projectName}
                  onOpenDay={openDay}
                  onPlanPeriod={(opened) => setPeriodUserId(opened.user.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openedDay && openedRow && (
        <PlanningDayModal
          key={`${openedDay.userId}-${openedDay.date}`}
          row={openedRow}
          date={openedDay.date}
          absence={openedAbsence}
          onAddAbsence={() =>
            setAbsenceForm({ user: openedRow.user, date: openedDay.date })
          }
          onClose={() => setOpenedDay(null)}
        />
      )}

      {readOnlyAbsence && (
        <LockedAbsenceModal
          absence={readOnlyAbsence.absence}
          subjectName={fullName(readOnlyAbsence.row.user)}
          reason={absenceInAnotherTeam(fullName(readOnlyAbsence.row.user))}
          onClose={() => setReadOnlyAbsence(null)}
        />
      )}

      {absenceForm && (
        <AbsenceFormModal
          open
          onClose={() => setAbsenceForm(null)}
          userId={absenceForm.user.id}
          subjectName={fullName(absenceForm.user)}
          date={absenceForm.date}
          endDate={absenceForm.endDate}
          // A new absence from a day is for that day; one from the period
          // form, or one opened to edit, picks its days.
          isSingleDay={!absenceForm.absence && !absenceForm.endDate}
          absence={absenceForm.absence}
          onCreate={async (payload) => {
            await absenceActions.create.mutateAsync({
              ...payload,
              userId: absenceForm.user.id,
            });
            // The day dialog this came from is now an absence day's.
            setOpenedDay(null);
          }}
          onUpdate={async (id, data) => {
            await absenceActions.update.mutateAsync({ id, data });
            setOpenedDay(null);
          }}
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
          weekDates={workingDates}
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
