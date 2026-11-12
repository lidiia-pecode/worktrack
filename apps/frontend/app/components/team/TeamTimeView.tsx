"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
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
  getWeekDates,
  getWeekEnd,
  fromISODate,
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
  nextTeamSort,
  searchTeamRows,
  sortTeamRows,
  TeamSort,
  TeamSortKey,
} from "@/lib/utils/team-rows";
import { cn } from "@/lib/utils/cn";
import { Absence, PlanningEntry, TeamSummaryUser, TimeLog } from "@/types";
import { UserRole } from "@/types/enums";

import { EmptyState } from "../shared/EmptyState";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { PartLoadError, PLANS_LOAD_ERROR } from "../shared/PartLoadError";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { WeekTotal } from "../shared/week/WeekTotal";
import { BackToThisWeekButton, WeekNav } from "../shared/week/WeekNav";
import { OnlyViewerNotice } from "../shared/week/OnlyViewerNotice";
import { onlyViewerReason } from "../shared/week/only-viewer";
import { NonWorkDayConfirm } from "../shared/week/NonWorkDayConfirm";
import {
  AbsenceFormModal,
  ABSENCE_IN_LOCKED_MONTH,
  absenceInAnotherTeam,
  LockedAbsenceModal,
} from "../timesheet/components/AbsenceFormModal";
import { TimeLogFormModal } from "../timesheet/components/TimeLogFormModal";
import { lastEntryChoiceKey } from "../timesheet/helpers/last-entry-choice";
import { managerWelcomeKey } from "./components/ManagerWelcome";
import { SortableHeading } from "./components/SortableHeading";
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

type WeekendToggleProps = {
  isShown: boolean;
  canHide: boolean;
  onChange: (isShown: boolean) => void;
};

/**
 * Opens Saturday and Sunday from the last weekday's heading, and folds them
 * from Sunday's: the control sits where the columns appear.
 */
const WeekendToggle = ({ isShown, canHide, onChange }: WeekendToggleProps) => {
  if (isShown && !canHide) return null;

  return (
    <button
      type="button"
      aria-expanded={isShown}
      aria-label={
        isShown ? "Hide Saturday and Sunday" : "Show Saturday and Sunday"
      }
      title={isShown ? "Hide the weekend" : "Show the weekend"}
      onClick={() => onChange(!isShown)}
      className={cn(
        "ml-auto flex shrink-0 cursor-pointer items-center gap-0.5 rounded-md py-px text-2xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isShown
          ? "px-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          : "bg-brand-subtle px-1 text-brand hover:bg-brand-muted",
      )}
    >
      {isShown ? (
        <ChevronLeft aria-hidden className="size-3" />
      ) : (
        <>
          Sat–Sun
          <ChevronRight aria-hidden className="size-3" />
        </>
      )}
    </button>
  );
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
  const {
    teamId,
    projectId,
    search,
    sort: sortInAddress,
    setFilters,
    setSearch,
    setSort,
    clearFilters,
  } = useTeamTimeFilters();
  // A link's sort by the week's total reads as Logged here.
  const sort = useMemo<TeamSort>(
    () =>
      sortInAddress.key === "planned"
        ? { ...sortInAddress, key: "logged" }
        : sortInAddress,
    [sortInAddress],
  );
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
  const {
    items: plannedEntries,
    isError: isPlansError,
    refetch: refetchPlans,
  } = usePlanningEntries({
    dateFrom,
    dateTo,
    teamId,
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
    teamId,
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
    isLoading: isLoadingLocks,
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

  // Weekends wait behind the toggle, unless someone shown has time on one,
  // which is never hidden.
  const [isWeekendWanted, setIsWeekendWanted] = useState(false);
  const hasWeekendTime = shownRows.some((row) =>
    row.days.some((day) => day.minutes > 0 && isWeekend(fromISODate(day.date))),
  );
  const showsWeekend = isWeekendWanted || hasWeekendTime;
  const shownDates = showsWeekend
    ? weekDates
    : weekDates.filter((date) => !isWeekend(date));

  const isSearching = Boolean(search.trim());
  const matchesNobody =
    (hasActiveFilters || isSearching) && shownRows.length === 0;

  // The response's total already follows the team and project; the search is
  // applied here, so while it is on the total is the shown rows'.
  const loggedMinutes = isSearching
    ? shownRows.reduce((sum, row) => sum + row.minutes, 0)
    : totals.minutes;
  const billableMinutes = isSearching
    ? shownRows.reduce((sum, row) => sum + row.billableMinutes, 0)
    : totals.billableMinutes;
  // What was expected of the people shown; a project's hours have none.
  const expectedMinutes = projectId
    ? undefined
    : shownRows.reduce((sum, row) => sum + row.expectedMinutes, 0);

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
  // The API says whether the viewer may change it (some of its days may be
  // another team's); here that is the person's and the owner's to do.
  const openedAbsenceReadOnlyReason = isOpenedAbsenceLocked
    ? ABSENCE_IN_LOCKED_MONTH
    : openedAbsence?.canChange === false && absenceForm
      ? absenceInAnotherTeam(fullName(absenceForm.user))
      : undefined;

  const sortBy = (key: TeamSortKey) => setSort(nextTeamSort(sort, key));
  const ariaSort = sort.direction === "asc" ? "ascending" : "descending";

  const retry = () => {
    void refetchPlans();
    void refetchSummary();
    void refetchSettings();
    void refetchAbsences();
    void refetchLocks();
  };

  // The locks too, so no day shows before it is known whether it can change.
  // The toolbar stays meanwhile, as on every page with a period.
  const isLoading =
    isLoadingSettings ||
    isLoadingSummary ||
    isLoadingAbsences ||
    isLoadingLocks;
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
              label="Logged"
              minutes={loggedMinutes}
              ofMinutes={expectedMinutes}
              billableMinutes={billableMinutes}
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
          search={search}
          onSearchChange={setSearch}
        />
      )}

      {isReady && isPlansError && (
        <PartLoadError onRetry={() => void refetchPlans()}>
          {PLANS_LOAD_ERROR}
        </PartLoadError>
      )}

      {isLoading && !hasError && (
        <LoadingState
          title="Loading the team's week"
          description="Fetching logged time and company settings."
        />
      )}

      {hasError && (
        <ErrorState
          title="We couldn't load the team's week"
          description="This week is unavailable right now."
          onRetry={retry}
        />
      )}

      {isReady && matchesNobody && (
        <EmptyState
          className="mt-3"
          icon={<SearchX />}
          title="Nobody matches"
          description="Nobody you can see matches the search, team or project you picked."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      )}

      {isReady && notice && (
        <div className="py-3 pr-3">
          <OnlyViewerNotice reason={notice} />
        </div>
      )}

      {isReady && !matchesNobody && (
        <div
          className={[
            "overflow-x-auto transition-opacity",
            isShowingPreviousWeek && "opacity-60",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-busy={isShowingPreviousWeek}
        >
          {/* Narrow weekends and the week's total on the right fit the
              table in a 1280px screen's content area. */}
          <table className="w-full min-w-240 table-fixed border-collapse">
            <colgroup>
              <col className="w-52" />

              {shownDates.map((date) => (
                <col
                  key={toISODate(date)}
                  className={cn(isWeekend(date) && "w-22")}
                />
              ))}

              <col className="w-32" />
            </colgroup>

            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th
                  scope="col"
                  aria-sort={sort.key === "name" ? ariaSort : undefined}
                  className={cn(STICKY_PERSON_CELL, "p-2 text-left align-top")}
                >
                  <SortableHeading
                    label="Person"
                    sortKey="name"
                    sort={sort}
                    onSort={sortBy}
                  />
                </th>

                {shownDates.map((date) => (
                  <th
                    key={toISODate(date)}
                    scope="col"
                    // Top-aligned, so Sunday's fold control under its date
                    // leaves every day on one line.
                    className="border-r border-border/60 p-0 align-top"
                  >
                    <WeekHeaderDay
                      date={date}
                      isToday={toISODate(date) === todayIso}
                      isLocked={isLocked(toISODate(date))}
                      action={
                        date === shownDates.at(-1) && (
                          <WeekendToggle
                            isShown={showsWeekend}
                            // Weekend time is never hidden.
                            canHide={!hasWeekendTime}
                            onChange={setIsWeekendWanted}
                          />
                        )
                      }
                    />
                  </th>
                ))}

                <th
                  scope="col"
                  aria-sort={sort.key === "logged" ? ariaSort : undefined}
                  className="p-2 pr-3 align-top"
                >
                  <SortableHeading
                    label="Logged"
                    sortKey="logged"
                    sort={sort}
                    onSort={sortBy}
                    alignEnd
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              {shownRows.map((row) => (
                <TeamWeekRow
                  key={row.user.id}
                  row={row}
                  weekDates={shownDates}
                  todayIso={todayIso}
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
        (openedAbsence && openedAbsenceReadOnlyReason ? (
          <LockedAbsenceModal
            absence={openedAbsence}
            reason={openedAbsenceReadOnlyReason}
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
