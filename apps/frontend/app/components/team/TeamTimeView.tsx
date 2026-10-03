"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";

import { useTeamTimeSummary } from "@/hooks/useTeamTimeSummary";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { useLockedDates } from "@/hooks/useReportingPeriods";
import { useDismissible } from "@/hooks/useDismissible";
import { useTeamOptions } from "@/hooks/useTeams";
import { TeamSummaryUser } from "@/types";
import { Button } from "@/components/ui/button";
import {
  formatDuration,
  formatWeekRangeLabel,
  getWeekDates,
  getWeekEnd,
  getWeekStart,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { canWriteTimeLogsFor } from "@/lib/utils/user";
import { mapAbsencesByUserAndDate } from "@/lib/utils/absence";
import { UserRole } from "@/types/enums";

import { EmptyState } from "../shared/EmptyState";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { WeekNav } from "../shared/week/WeekNav";
import { OnlyViewerNotice } from "../shared/week/OnlyViewerNotice";
import { onlyViewerReason } from "../shared/week/only-viewer";
import { managerWelcomeKey } from "./components/ManagerWelcome";
import { TeamFilters } from "./components/TeamFilters";
import { TeamWeekRow } from "./components/TeamWeekRow";
import { UserTimeDetailPanel } from "./components/UserTimeDetailPanel";

type TeamTimeViewProps = {
  role: UserRole;
  viewerId: string;
};

export const TeamTimeView = ({ role, viewerId }: TeamTimeViewProps) => {
  const {
    weekStartDay,
    timezone,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useWorkSettings();

  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [teamId, setTeamId] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [openedUser, setOpenedUser] = useState<TeamSummaryUser | null>(null);

  const weekStart = useMemo(
    () => getWeekStart(anchorDate, weekStartDay),
    [anchorDate, weekStartDay],
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
  });

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

  const { isLocked, isEditable } = useLockedDates(dateFrom, dateTo);

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

  const todayIso = todayISODate(timezone);
  const hasError = isSettingsError || isSummaryError || isAbsencesError;

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 pr-3">
        <WeekNav weekStart={weekStart} onWeekChange={setAnchorDate} />

        {!hasError && (
          <div className="flex items-center gap-2 text-sm">
            <span>Team logged:</span>

            <span className="font-medium text-foreground tabular-nums">
              {formatDuration(totals.minutes)}
            </span>
          </div>
        )}
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
          description="Logged time for this week is unavailable right now."
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
              <col className="w-56" />

              {weekDates.map((date) => (
                <col key={toISODate(date)} className="w-24" />
              ))}

              <col className="w-36" />
            </colgroup>

            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th
                  scope="col"
                  className="border-r border-border/60 p-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
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

                <th
                  scope="col"
                  className="p-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Week / expected
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <TeamWeekRow
                  key={row.user.id}
                  row={row}
                  weekDates={weekDates}
                  absencesByDate={absencesByUser[row.user.id] ?? {}}
                  onOpen={(opened) => setOpenedUser(opened.user)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openedUser && (
        <UserTimeDetailPanel
          key={openedUser.id}
          user={openedUser}
          weekDates={weekDates}
          weekLabel={formatWeekRangeLabel(weekStart)}
          todayIso={todayIso}
          canWrite={canWriteTimeLogsFor(role, viewerId, openedUser.id)}
          isLocked={isLocked}
          isEditable={isEditable}
          onClose={() => setOpenedUser(null)}
        />
      )}
    </div>
  );
};
