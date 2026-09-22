"use client";

import { useMemo, useState } from "react";
import { SearchX, UsersRound } from "lucide-react";

import { usePlanningWeek } from "@/hooks/usePlanning";
import { useAbsencesQuery } from "@/hooks/useAbsences";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import {
  formatDuration,
  getWeekDates,
  getWeekStart,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { mapAbsencesByUserAndDate } from "@/lib/utils/absence";
import { UserRole } from "@/types/enums";

import { Button } from "@/components/ui/button";

import Container from "../layout/Container";
import { EmptyState } from "../shared/EmptyState";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { WeekNav } from "../shared/week/WeekNav";
import { TeamFilters } from "../team/components/TeamFilters";
import { PlanningDayModal } from "./components/PlanningDayModal";
import { PlanningWeekRow } from "./components/PlanningWeekRow";

const WEEK_PAGE_SIZE = 500;

type OpenedDay = {
  userId: string;
  date: string;
};

type PlanningWeekViewProps = {
  role: UserRole;
};

export const PlanningWeekView = ({ role }: PlanningWeekViewProps) => {
  const {
    weekStartDay,
    timezone,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useWorkSettings();

  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [teamId, setTeamId] = useState<string | undefined>();
  const [openedDay, setOpenedDay] = useState<OpenedDay | null>(null);

  const weekStart = useMemo(
    () => getWeekStart(anchorDate, weekStartDay),
    [anchorDate, weekStartDay],
  );

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const {
    week,
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
      row.entries.forEach((entry) => {
        totalsByDate[entry.date] =
          (totalsByDate[entry.date] ?? 0) + entry.plannedMinutes;
      });
    });

    return totalsByDate;
  }, [rows]);

  const totalPlanned = rows.reduce((sum, row) => sum + row.plannedMinutes, 0);

  // Looked up from the latest rows so the open day refreshes after each save.
  const openedRow = openedDay
    ? rows.find((row) => row.user.id === openedDay.userId)
    : undefined;

  const todayIso = todayISODate(timezone);
  const hasError = isSettingsError || isWeekError || isAbsencesError;

  const retry = () => {
    void refetchWeek();
    void refetchSettings();
    void refetchAbsences();
  };

  if (isLoadingSettings || isLoadingWeek || isLoadingAbsences) {
    return (
      <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
        <LoadingState
          title="Loading the week's plan"
          description="Fetching planned work and workspace settings."
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
            <span>Team planned:</span>

            <span className="font-medium text-foreground tabular-nums">
              {formatDuration(totalPlanned)}
            </span>
          </div>
        )}
      </div>

      {!hasError && <TeamFilters teamId={teamId} onTeamChange={setTeamId} />}

      {hasError && (
        <ErrorState
          title="We couldn't load the week's plan"
          description="Planned work for this week is unavailable right now."
          onRetry={retry}
        />
      )}

      {!hasError && rows.length === 0 && (
        <div className="p-6">
          {teamId ? (
            <EmptyState
              icon={<SearchX />}
              title="Nobody in this team"
              description="The team you picked has nobody you can plan for."
              action={
                <Button
                  variant="secondary"
                  onClick={() => setTeamId(undefined)}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<UsersRound />}
              title={
                role === UserRole.MANAGER
                  ? "You don't lead a team yet"
                  : "Nobody to plan for yet"
              }
              description={
                role === UserRole.MANAGER
                  ? "You plan for the people in teams you manage. Ask an owner to make you the manager of a team, and their week will appear here."
                  : "Once people join the workspace, you can plan their week here."
              }
            />
          )}
        </div>
      )}

      {!hasError && rows.length > 0 && (
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
                <col key={toISODate(date)} className="w-28" />
              ))}

              <col className="w-28" />
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
                  Week planned
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <PlanningWeekRow
                  key={row.user.id}
                  row={row}
                  weekDates={weekDates}
                  absencesByDate={absencesByUser[row.user.id] ?? {}}
                  onOpenDay={(opened, date) =>
                    setOpenedDay({ userId: opened.user.id, date })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openedDay && openedRow && week && (
        <PlanningDayModal
          key={`${openedDay.userId}-${openedDay.date}`}
          row={openedRow}
          date={openedDay.date}
          dayLimitMinutes={week.dayLimitMinutes}
          onClose={() => setOpenedDay(null)}
        />
      )}
    </Container>
  );
};
