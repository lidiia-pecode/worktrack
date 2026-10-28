"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTeamTimeSummary } from "@/hooks/useTeamTimeSummary";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { useShownWeek } from "@/hooks/useShownWeek";
import { useLockedDates } from "@/hooks/useReportingPeriods";
import { useDismissible } from "@/hooks/useDismissible";
import { useTeamOptions } from "@/hooks/useTeams";
import { usePlanningEntries } from "@/hooks/usePlanning";
import { useAllProjectsQuery } from "@/hooks/useProjects";
import { useAbsencesMutations } from "@/hooks/useAbsences";
import { useTimeLogsMutations } from "@/hooks/useTimelogs";
import {
  assignableActivitiesQuery,
  useAssignableActivities,
} from "@/hooks/useAssignableActivities";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  formatDuration,
  getWeekDates,
  getWeekEnd,
  isWeekend,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import {
  mapAbsencesByUserAndDate,
  newAbsenceStartDate,
} from "@/lib/utils/absence";
import { isRangeLocked, lockLookupRange } from "@/lib/utils/reporting-period";
import { canWriteTimeLogsFor, fullName } from "@/lib/utils/user";
import {
  DEFAULT_TEAM_SORT,
  nextTeamSort,
  searchTeamRows,
  sortTeamRows,
  TeamSortKey,
} from "@/lib/utils/team-rows";
import { cn } from "@/lib/utils/cn";
import { Absence, PlanningEntry, TeamSummaryUser, TimeLog } from "@/types";
import { UserRole } from "@/types/enums";

import { EmptyState } from "../shared/EmptyState";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { BackToThisWeekButton, WeekNav } from "../shared/week/WeekNav";
import { OnlyViewerNotice } from "../shared/week/OnlyViewerNotice";
import { onlyViewerReason } from "../shared/week/only-viewer";
import { NonWorkDayConfirm } from "../shared/week/NonWorkDayConfirm";
import {
  AbsenceFormModal,
  LockedAbsenceModal,
} from "../timesheet/components/AbsenceFormModal";
import { TimeLogFormModal } from "../timesheet/components/TimeLogFormModal";
import { lastEntryChoiceKey } from "../timesheet/helpers/last-entry-choice";
import { managerWelcomeKey } from "./components/ManagerWelcome";
import { PersonSortHeader } from "./components/PersonSortHeader";
import { TeamFilters } from "./components/TeamFilters";
import { TeamWeekRow } from "./components/TeamWeekRow";
import { STICKY_PERSON_CELL } from "../shared/week/sticky-column";
import { useTeamTimeFilters } from "./useTeamTimeFilters";

type EntryForm = {
  user: TeamSummaryUser;
  date: string;
  timelog?: TimeLog;
  plannedProjectId?: string;
};

type AbsenceForm = {
  user: TeamSummaryUser;
  date: string;
  absence?: Absence;
};

type TeamTimeViewProps = {
  role: UserRole;
  viewerId: string;
  /** A person whose row to mark and scroll to, from a link. */
  highlightedPersonId?: string;
};

export const TeamTimeView = ({
  role,
  viewerId,
  highlightedPersonId,
}: TeamTimeViewProps) => {
  const {
    timezone,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useWorkSettings();

  const { weekStart, showWeekOf } = useShownWeek();
  const { teamId, projectId, setFilters } = useTeamTimeFilters();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(DEFAULT_TEAM_SORT);
  const [entryForm, setEntryForm] = useState<EntryForm | null>(null);
  const [pendingEntryForm, setPendingEntryForm] = useState<EntryForm | null>(
    null,
  );
  const [nonWorkDay, setNonWorkDay] = useState<EntryForm | null>(null);
  const [absenceForm, setAbsenceForm] = useState<AbsenceForm | null>(null);

  const queryClient = useQueryClient();
  const timelogActions = useTimeLogsMutations();
  const absenceActions = useAbsencesMutations();
  // Already in the cache by the time the form opens (`openEntryForm`).
  const { items: pickerItems } = useAssignableActivities(
    entryForm?.user.id,
    Boolean(entryForm),
  );

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const dateFrom = toISODate(weekStart);
  const dateTo = toISODate(getWeekEnd(weekStart));

  const {
    rows,
    totals,
    isLoading: isLoadingSummary,
    isPlaceholderData: isShowingPreviousWeek,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useTeamTimeSummary({
    dateFrom,
    dateTo,
    teamId,
    projectId,
    includeEntries: true,
  });

  // Context for an empty day, narrowed like the entries; a failed load leaves
  // the days without it.
  const { items: plannedEntries } = usePlanningEntries({
    dateFrom,
    dateTo,
    projectId,
  });

  const plansByUser = useMemo(() => {
    const byUser: Record<string, Record<string, PlanningEntry[]>> = {};

    plannedEntries.forEach((entry) => {
      ((byUser[entry.userId] ??= {})[entry.date] ??= []).push(entry);
    });

    return byUser;
  }, [plannedEntries]);

  // The same list the project filter shows, so it comes from the cache.
  const { items: projects } = useAllProjectsQuery();
  // Set whenever a project filters the grid, even before its name has loaded.
  const projectName = projectId
    ? (projects.find((project) => project.id === projectId)?.name ??
      "this project")
    : undefined;

  const {
    items: absences,
    isLoading: isLoadingAbsences,
    isError: isAbsencesError,
    refetch: refetchAbsences,
  } = useAllAbsencesQuery({
    dateFrom,
    dateTo,
  });

  const absencesByUser = useMemo(
    () => mapAbsencesByUserAndDate(absences, weekDates.map(toISODate)),
    [absences, weekDates],
  );

  const todayIso = todayISODate(timezone);

  // An absence is frozen whole once any of its days locks, so its months count.
  const lockRange = lockLookupRange(dateFrom, dateTo, absences, todayIso);
  const {
    isLocked,
    isEditable,
    isError: isLocksError,
    refetch: refetchLocks,
  } = useLockedDates(lockRange.dateFrom, lockRange.dateTo);

  const {
    options: teamOptions,
    isLoading: isLoadingTeams,
    isError: isTeamsError,
  } = useTeamOptions();
  const { isDismissed: isManagerWelcomeDismissed } = useDismissible(
    managerWelcomeKey(viewerId),
  );

  const hasError =
    isSettingsError || isSummaryError || isAbsencesError || isLocksError;

  const hasActiveFilters = Boolean(teamId ?? projectId);

  const shownRows = useMemo(
    () =>
      sortTeamRows(searchTeamRows(rows, search), sort, {
        byProject: Boolean(projectId),
      }),
    [rows, search, sort, projectId],
  );

  const matchesNobody =
    (hasActiveFilters || Boolean(search.trim())) && shownRows.length === 0;

  const onlyViewer = onlyViewerReason({
    role,
    viewerId,
    rowUserIds: rows.map((row) => row.user.id),
    hasActiveFilters,
    ledTeamCount: teamOptions.length,
  });
  const notice =
    isLoadingTeams ||
    isTeamsError ||
    (role === UserRole.MANAGER && !isManagerWelcomeDismissed)
      ? null
      : onlyViewer;

  // The form reads its defaults once, so it mounts only after the person's
  // activities have loaded; the day shows as busy meanwhile.
  const openEntryForm = async (form: EntryForm) => {
    // A second click while one loads would swap the form under its defaults.
    if (pendingEntryForm) return;

    setPendingEntryForm(form);
    try {
      await queryClient.ensureQueryData(
        assignableActivitiesQuery(form.user.id),
      );
      setEntryForm(form);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPendingEntryForm(null);
    }
  };

  // Plans never fall on a weekend, so the confirmation needs no project.
  const openCreate = (
    user: TeamSummaryUser,
    date: Date,
    plannedProjectId?: string,
  ) => {
    const form = { user, date: toISODate(date), plannedProjectId };

    if (isWeekend(date)) {
      setNonWorkDay(form);
      return;
    }

    void openEntryForm(form);
  };

  const confirmNonWorkDay = () => {
    if (!nonWorkDay) return;

    void openEntryForm(nonWorkDay);
    setNonWorkDay(null);
  };

  const isCurrentWeek = dateFrom <= todayIso && todayIso <= dateTo;
  const openNewAbsence = (user: TeamSummaryUser) =>
    setAbsenceForm({
      user,
      date: newAbsenceStartDate({
        today: new Date(`${todayIso}T00:00:00`),
        weekStart,
        isCurrentWeek,
        isEditable,
      }),
    });

  const openedAbsence = absenceForm?.absence;
  // Locked as a whole once any of its days is, as on the timesheet.
  const isOpenedAbsenceLocked =
    !!openedAbsence &&
    isRangeLocked(isLocked, openedAbsence.startDate, openedAbsence.endDate);

  const clearFilters = () => {
    setFilters({ teamId: undefined, projectId: undefined });
    setSearch("");
  };

  const sortBy = (key: TeamSortKey) => setSort(nextTeamSort(sort, key));

  const retry = () => {
    void refetchSummary();
    void refetchSettings();
    void refetchAbsences();
    void refetchLocks();
  };

  if (isLoadingSettings || isLoadingSummary || isLoadingAbsences) {
    return (
      <div className="flex flex-col">
        <LoadingState
          title="Loading the team's week"
          description="Fetching logged time and workspace settings."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pr-3 pb-3">
        <WeekNav weekStart={weekStart} onWeekChange={showWeekOf} />

        <div className="flex flex-wrap items-center gap-3">
          <BackToThisWeekButton
            weekStart={weekStart}
            onWeekChange={showWeekOf}
          />

          {!hasError && (
            <div className="flex items-center gap-2 text-sm">
              <span>Team logged:</span>

              <span className="font-medium text-foreground tabular-nums">
                {formatDuration(totals.minutes)}
              </span>
            </div>
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
          search={search}
          onSearchChange={setSearch}
        />
      )}

      {hasError && (
        <ErrorState
          title="We couldn't load the team's week"
          description="This week is unavailable right now."
          onRetry={retry}
        />
      )}

      {!hasError && matchesNobody && (
        <div className="p-6">
          <EmptyState
            icon={<SearchX />}
            title="Nobody matches"
            description="Nobody you can see matches the search, team or project you picked."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </div>
      )}

      {!hasError && notice && (
        <div className="py-3 pr-3">
          <OnlyViewerNotice reason={notice} />
        </div>
      )}

      {!hasError && !matchesNobody && (
        <div
          className={[
            "overflow-x-auto transition-opacity",
            isShowingPreviousWeek && "opacity-60",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-busy={isShowingPreviousWeek}
        >
          <table className="w-full min-w-5xl table-fixed border-collapse">
            <colgroup>
              <col className="w-52" />

              {weekDates.map((date) => (
                <col key={toISODate(date)} />
              ))}
            </colgroup>

            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th
                  scope="col"
                  aria-sort={
                    sort.direction === "asc" ? "ascending" : "descending"
                  }
                  aria-label={`Person, sorted by ${sort.key === "name" ? "name" : "logged time"}`}
                  className={cn(STICKY_PERSON_CELL, "p-1.5 text-left")}
                >
                  <PersonSortHeader sort={sort} onSort={sortBy} />
                </th>

                {weekDates.map((date) => (
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
              </tr>
            </thead>

            <tbody>
              {shownRows.map((row) => (
                <TeamWeekRow
                  key={row.user.id}
                  row={row}
                  weekDates={weekDates}
                  todayIso={todayIso}
                  timezone={timezone}
                  absencesByDate={absencesByUser[row.user.id] ?? {}}
                  plansByDate={plansByUser[row.user.id] ?? {}}
                  isLocked={isLocked}
                  isEditable={isEditable}
                  projectName={projectName}
                  canWrite={canWriteTimeLogsFor(role, viewerId, row.user.id)}
                  isHighlighted={row.user.id === highlightedPersonId}
                  busyDate={
                    pendingEntryForm?.user.id === row.user.id
                      ? pendingEntryForm.date
                      : undefined
                  }
                  onEditEntry={(timelog) =>
                    void openEntryForm({
                      user: row.user,
                      date: timelog.date,
                      timelog,
                    })
                  }
                  onAdd={(date, plannedProjectId) =>
                    openCreate(row.user, date, plannedProjectId)
                  }
                  onAbsenceClick={(absence) =>
                    setAbsenceForm({
                      user: row.user,
                      date: absence.startDate,
                      absence,
                    })
                  }
                  onAddAbsence={() => openNewAbsence(row.user)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NonWorkDayConfirm
        date={nonWorkDay ? new Date(`${nonWorkDay.date}T00:00:00`) : null}
        onClose={() => setNonWorkDay(null)}
        onConfirm={confirmNonWorkDay}
      />

      {absenceForm &&
        (openedAbsence && isOpenedAbsenceLocked ? (
          <LockedAbsenceModal
            absence={openedAbsence}
            subjectName={fullName(absenceForm.user)}
            onClose={() => setAbsenceForm(null)}
          />
        ) : (
          <AbsenceFormModal
            open
            onClose={() => setAbsenceForm(null)}
            userId={absenceForm.user.id}
            subjectName={fullName(absenceForm.user)}
            date={absenceForm.date}
            absence={openedAbsence}
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
        ))}

      {entryForm && (
        <TimeLogFormModal
          open
          onClose={() => setEntryForm(null)}
          date={entryForm.date}
          subjectName={fullName(entryForm.user)}
          rememberKey={lastEntryChoiceKey(viewerId, entryForm.user.id)}
          plannedProjectId={entryForm.plannedProjectId}
          timelog={entryForm.timelog}
          pickerItems={pickerItems}
          onCreate={(payload) =>
            timelogActions.create.mutateAsync({
              ...payload,
              userId: entryForm.user.id,
            })
          }
          onUpdate={(id, data) =>
            timelogActions.update.mutateAsync({ id, data })
          }
          onDelete={(id) => timelogActions.delete.mutateAsync(id)}
          isSaving={
            timelogActions.create.isPending || timelogActions.update.isPending
          }
          isDeleting={timelogActions.delete.isPending}
        />
      )}
    </div>
  );
};
