"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";

import { usePlanningWeek } from "@/hooks/usePlanning";
import { useAbsencesMutations, useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { useShownWeek } from "@/hooks/useShownWeek";
import { useLockedDates } from "@/hooks/useReportingPeriods";
import { useTeamOptions } from "@/hooks/useTeams";
import {
  formatDuration,
  getWeekDates,
  getWeekEnd,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { mapAbsencesByUserAndDate } from "@/lib/utils/absence";
import { isRangeLocked, lockLookupRange } from "@/lib/utils/reporting-period";
import { Absence } from "@/types";
import { UserRole } from "@/types/enums";

import { Button } from "@/components/ui/button";

import { EmptyState } from "../shared/EmptyState";
import { OnlyViewerNotice } from "../shared/week/OnlyViewerNotice";
import { onlyViewerReason } from "../shared/week/only-viewer";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { WeekNav } from "../shared/week/WeekNav";
import { TeamFilters } from "../team/components/TeamFilters";
import { AbsenceFormModal } from "../timesheet/components/AbsenceFormModal";
import { PlanningDayModal } from "./components/PlanningDayModal";
import { PlanPeriodModal } from "./components/PlanPeriodModal";
import { PlanningWeekRow } from "./components/PlanningWeekRow";

type OpenedDay = {
  userId: string;
  date: string;
};

type AbsenceFormState = {
  userId: string;
  date: string;
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
  const [teamId, setTeamId] = useState<string | undefined>();
  const [openedDay, setOpenedDay] = useState<OpenedDay | null>(null);
  const [absenceForm, setAbsenceForm] = useState<AbsenceFormState | null>(null);
  const [periodUserId, setPeriodUserId] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const dateFrom = toISODate(weekStart);
  const dateTo = toISODate(getWeekEnd(weekStart));

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
  } = useAllAbsencesQuery({
    dateFrom,
    dateTo,
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
    isError: isLocksError,
    refetch: refetchLocks,
  } = useLockedDates(lockRange.dateFrom, lockRange.dateTo);

  const absenceActions = useAbsencesMutations();

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
  const totalAvailable = rows.reduce(
    (sum, row) => sum + row.availableMinutes,
    0,
  );

  const openedRow = openedDay
    ? rows.find((row) => row.user.id === openedDay.userId)
    : undefined;
  const openedAbsence = openedDay
    ? absencesByUser[openedDay.userId]?.[openedDay.date]
    : undefined;
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
    hasActiveFilters: Boolean(teamId),
    ledTeamCount: teamOptions.length,
  });
  const onlyViewer = isLoadingTeams || isTeamsError ? null : onlyViewerFromRows;

  if (isLoadingSettings || isLoadingWeek || isLoadingAbsences) {
    return (
      <div className="flex flex-col">
        <LoadingState
          title="Loading the week's plan"
          description="Fetching planned work and workspace settings."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 pr-3">
        <WeekNav weekStart={weekStart} onWeekChange={showWeekOf} />

        {!hasError && (
          <div className="flex items-center gap-2 text-sm">
            <span>Team planned:</span>

            <span className="font-medium text-foreground tabular-nums">
              {formatDuration(totalPlanned)}
            </span>

            <span className="text-muted-foreground">/</span>

            <span className="text-muted-foreground tabular-nums">
              {formatDuration(totalAvailable)} available
            </span>
          </div>
        )}
      </div>

      {!hasError && <TeamFilters teamId={teamId} onTeamChange={setTeamId} />}

      {hasError && (
        <ErrorState
          title="We couldn't load the week's plan"
          description="This week is unavailable right now."
          onRetry={retry}
        />
      )}

      {!hasError && rows.length === 0 && (
        <div className="p-6">
          <EmptyState
            icon={<SearchX />}
            title="Nobody matches these filters"
            description="Nobody you can plan for is in the team you picked."
            action={
              <Button variant="secondary" onClick={() => setTeamId(undefined)}>
                Clear filters
              </Button>
            }
          />
        </div>
      )}

      {!hasError && onlyViewer && (
        <div className="py-3 pr-3">
          <OnlyViewerNotice reason={onlyViewer} />
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

              <col className="w-36" />
            </colgroup>

            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th
                  scope="col"
                  className="border-r border-border/60 p-2 text-left text-2xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Person
                  <span className="block font-normal normal-case tracking-normal">
                    click to plan a period
                  </span>
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
                  className="p-2 text-right text-2xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Planned / available
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
                  isLocked={isLocked}
                  isEditable={isEditable}
                  onOpenDay={(opened, date) => {
                    // An absence day opens the absence itself, unless a
                    // locked month freezes it; then the day dialog says so.
                    const absence = absencesByUser[opened.user.id]?.[date];
                    const isAbsenceEditable =
                      !!absence &&
                      !isRangeLocked(
                        isLocked,
                        absence.startDate,
                        absence.endDate,
                      );

                    if (absence && isAbsenceEditable) {
                      setAbsenceForm({
                        userId: opened.user.id,
                        date: absence.startDate,
                        absence,
                      });
                    } else {
                      setOpenedDay({ userId: opened.user.id, date });
                    }
                  }}
                  onPlanPeriod={(opened) => setPeriodUserId(opened.user.id)}
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
          absence={openedAbsence}
          onAddAbsence={() =>
            setAbsenceForm({ userId: openedDay.userId, date: openedDay.date })
          }
          onClose={() => setOpenedDay(null)}
        />
      )}

      {absenceForm && (
        <AbsenceFormModal
          open
          onClose={() => setAbsenceForm(null)}
          userId={absenceForm.userId}
          date={absenceForm.date}
          absence={absenceForm.absence}
          onCreate={(payload) =>
            absenceActions.create.mutateAsync({
              ...payload,
              userId: absenceForm.userId,
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

      {periodRow && week && (
        <PlanPeriodModal
          key={periodRow.user.id}
          row={periodRow}
          dayLimitMinutes={week.dayLimitMinutes}
          onClose={() => setPeriodUserId(null)}
        />
      )}
    </div>
  );
};
