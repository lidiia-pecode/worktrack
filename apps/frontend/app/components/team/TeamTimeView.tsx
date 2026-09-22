"use client";

import { useMemo, useState } from "react";

import { useTeamTimeSummary } from "@/hooks/useTeamTimeSummary";
import { useAbsencesQuery } from "@/hooks/useAbsences";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { TeamSummaryUser } from "@/types";
import {
  formatDuration,
  formatWeekRangeLabel,
  getWeekDates,
  getWeekStart,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { canWriteTimeLogsFor } from "@/lib/utils/user";
import { mapAbsencesByUserAndDate } from "@/lib/utils/absence";
import { UserRole } from "@/types/enums";

import Container from "../layout/Container";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { WeekNav } from "../shared/week/WeekNav";
import { TeamEmptyState } from "./components/TeamEmptyState";
import { TeamFilters } from "./components/TeamFilters";
import { TeamWeekRow } from "./components/TeamWeekRow";
import { UserTimeDetailPanel } from "./components/UserTimeDetailPanel";

const WEEK_PAGE_SIZE = 500;

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

  const {
    rows,
    totals,
    isLoading: isLoadingSummary,
    isPlaceholderData: isShowingPreviousWeek,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useTeamTimeSummary({
    dateFrom: toISODate(weekDates[0]),
    dateTo: toISODate(weekDates[6]),
    teamId,
    projectId,
  });

  const {
    items: absences,
    isLoading: isLoadingAbsences,
    isError: isAbsencesError,
    refetch: refetchAbsences,
  } = useAbsencesQuery(1, {
    dateFrom: toISODate(weekDates[0]),
    dateTo: toISODate(weekDates[6]),
    pageSize: WEEK_PAGE_SIZE,
  });

  const absencesByUser = useMemo(
    () => mapAbsencesByUserAndDate(absences, weekDates.map(toISODate)),
    [absences, weekDates],
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
  const hasNobodyToShow = rows.length === 0;

  // A week where everyone was away is the case this view exists to explain,
  // so absences alone are reason enough to show the grid.
  const isEmpty =
    hasNobodyToShow || (totals.minutes === 0 && absences.length === 0);

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
      <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
        <LoadingState
          title="Loading the team's week"
          description="Fetching logged time and workspace settings."
        />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
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

      {!hasError && isEmpty && (
        <div className="p-6">
          <TeamEmptyState
            hasNobodyToShow={hasNobodyToShow}
            hasActiveFilters={hasActiveFilters}
            role={role}
            weekLabel={formatWeekRangeLabel(weekStart)}
            onClearFilters={clearFilters}
          />
        </div>
      )}

      {!hasError && !isEmpty && (
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
        // Keyed per person: the timelog query keeps the previous page while
        // loading, and reusing the panel would flash one person's entries
        // under another's name.
        <UserTimeDetailPanel
          key={openedUser.id}
          user={openedUser}
          weekDates={weekDates}
          weekLabel={formatWeekRangeLabel(weekStart)}
          todayIso={todayIso}
          canWrite={canWriteTimeLogsFor(role, viewerId, openedUser.id)}
          onClose={() => setOpenedUser(null)}
        />
      )}
    </Container>
  );
};
