"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";

import { useTeamTimeSummary } from "@/hooks/useTeamTimeSummary";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { useShownWeek } from "@/hooks/useShownWeek";
import { useLockedDates } from "@/hooks/useReportingPeriods";
import { useDismissible } from "@/hooks/useDismissible";
import { useTeamOptions } from "@/hooks/useTeams";
import { usePlanningEntries } from "@/hooks/usePlanning";
import { useAllProjectsQuery } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import {
  formatDuration,
  getWeekDates,
  getWeekEnd,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { mapAbsencesByUserAndDate } from "@/lib/utils/absence";
import { lockLookupRange } from "@/lib/utils/reporting-period";
import { cn } from "@/lib/utils/cn";
import { PlanningEntry } from "@/types";
import { ProjectStatus, UserRole } from "@/types/enums";

import { EmptyState } from "../shared/EmptyState";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { BackToThisWeekButton, WeekNav } from "../shared/week/WeekNav";
import { OnlyViewerNotice } from "../shared/week/OnlyViewerNotice";
import { onlyViewerReason } from "../shared/week/only-viewer";
import { managerWelcomeKey } from "./components/ManagerWelcome";
import { TeamFilters } from "./components/TeamFilters";
import { TeamWeekRow } from "./components/TeamWeekRow";
import { STICKY_PERSON_CELL } from "../shared/week/sticky-column";

type TeamTimeViewProps = {
  role: UserRole;
  viewerId: string;
  /** A day whose week to open first, from a link. */
  startingDay?: string;
};

export const TeamTimeView = ({
  role,
  viewerId,
  startingDay,
}: TeamTimeViewProps) => {
  const {
    timezone,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useWorkSettings();

  const { weekStart, showWeekOf } = useShownWeek(startingDay);
  const [teamId, setTeamId] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();

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
  const { items: projects } = useAllProjectsQuery({
    status: ProjectStatus.ACTIVE,
  });
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

  const dailyTotals = useMemo(() => {
    const totalsByDate: Record<string, number> = {};

    rows.forEach((row) => {
      row.days.forEach((day) => {
        totalsByDate[day.date] = (totalsByDate[day.date] ?? 0) + day.minutes;
      });
    });

    return totalsByDate;
  }, [rows]);

  const hasError =
    isSettingsError || isSummaryError || isAbsencesError || isLocksError;

  const hasActiveFilters = Boolean(teamId ?? projectId);

  const matchesNobody = hasActiveFilters && rows.length === 0;

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

  const clearFilters = () => {
    setTeamId(undefined);
    setProjectId(undefined);
  };

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
          onTeamChange={setTeamId}
          onProjectChange={setProjectId}
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
            title="Nobody matches these filters"
            description="Nobody you can see is in the team or on the project you picked."
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
                  className={cn(
                    STICKY_PERSON_CELL,
                    "p-2 text-left text-2xs font-medium uppercase tracking-wider text-muted-foreground",
                  )}
                >
                  Person
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
                      totalMinutes={dailyTotals[toISODate(date)] ?? 0}
                      isLocked={isLocked(toISODate(date))}
                    />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <TeamWeekRow
                  key={row.user.id}
                  row={row}
                  weekDates={weekDates}
                  todayIso={todayIso}
                  absencesByDate={absencesByUser[row.user.id] ?? {}}
                  plansByDate={plansByUser[row.user.id] ?? {}}
                  isLocked={isLocked}
                  projectName={projectName}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
