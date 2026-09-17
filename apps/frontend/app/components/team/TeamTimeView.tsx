"use client";

import { useMemo, useState } from "react";

import { useTeamTimeSummary } from "@/hooks/useTeamTimeSummary";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import {
  formatDuration,
  getWeekDates,
  getWeekStart,
  isWeekend,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";

import Container from "../layout/Container";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { WeekNav } from "../shared/week/WeekNav";
import { TeamWeekRow } from "./components/TeamWeekRow";

export const TeamTimeView = () => {
  const {
    weekStartDay,
    dailyTargetMinutes,
    timezone,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useWorkSettings();

  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const weekStart = useMemo(
    () => getWeekStart(anchorDate, weekStartDay),
    [anchorDate, weekStartDay],
  );

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const {
    rows,
    totals,
    isLoading: isLoadingSummary,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useTeamTimeSummary({
    dateFrom: toISODate(weekDates[0]),
    dateTo: toISODate(weekDates[6]),
  });

  /**
   * The same target the timesheet shows, so the two views cannot disagree.
   * Part-time capacity and absences are not in it yet, so it stays context
   * rather than a judgement.
   */
  const expectedMinutes = useMemo(
    () =>
      dailyTargetMinutes * weekDates.filter((date) => !isWeekend(date)).length,
    [dailyTargetMinutes, weekDates],
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
  const hasError = isSettingsError || isSummaryError;

  const retry = () => {
    void refetchSummary();
    void refetchSettings();
  };

  if (isLoadingSettings || isLoadingSummary) {
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

      {hasError && (
        <ErrorState
          title="We couldn't load the team's week"
          description="Logged time for this week is unavailable right now."
          onRetry={retry}
        />
      )}

      {!hasError && (
        <div className="overflow-x-auto">
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
                  expectedMinutes={expectedMinutes}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
};
