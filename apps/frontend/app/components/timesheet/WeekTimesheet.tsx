"use client";

import { ReactNode, useMemo, useState } from "react";

import { CalendarOff, FolderKanban, ListTodo } from "lucide-react";

import { useTimelogs } from "@/hooks/useTimelogs";
import { useGraceMonth, useLockedDates } from "@/hooks/useReportingPeriods";
import { useAbsences } from "@/hooks/useAbsences";
import { useExpectedHours } from "@/hooks/useExpectedHours";
import { useAssignableActivities } from "@/hooks/useAssignableActivities";
import { useOwnProjects } from "@/hooks/useProjects";
import { usePlanningEntries } from "@/hooks/usePlanning";
import { Absence, PlanningEntry, TimeLog } from "@/types";
import {
  companyToday,
  formatWeekdayLabel,
  getWeekDates,
  getWeekEnd,
  isWeekend,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { useShownWeek } from "@/hooks/useShownWeek";
import {
  ABSENCE_TYPE_LABELS,
  mapAbsencesByDate,
  newAbsenceStartDate,
} from "@/lib/utils/absence";
import { isRangeLocked, lockLookupRange } from "@/lib/utils/reporting-period";
import { groupTimelogsByDate } from "@/lib/utils/timelog";
import { cn } from "@/lib/utils/cn";

import { EmptyState } from "../shared/EmptyState";
import { PageHeader } from "../shared/PageHeader";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { BackToThisWeekButton, WeekNav } from "../shared/week/WeekNav";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { NonWorkDayConfirm } from "../shared/week/NonWorkDayConfirm";
import { Button } from "@/components/ui/button";
import {
  AbsenceFormModal,
  LockedAbsenceModal,
} from "./components/AbsenceFormModal";
import { DayColumn } from "./components/DayColumn";
import { stackHeight } from "./helpers/build-segments";
import { TimeLogFormModal } from "./components/TimeLogFormModal";
import { lastEntryChoiceKey } from "./helpers/last-entry-choice";
import { WeekSummary } from "./components/WeekSummary";
import { GraceMonthNote } from "./components/GraceMonthNote";
import { showsWeekFigures, timesheetContentFor } from "./helpers/first-run";

type ModalState = {
  date: string;
  timelog?: TimeLog;
  plannedProjectId?: string;
};

type AbsenceModalState = {
  date: string;
  absence?: Absence;
};

const PX_PER_HOUR = 56;
const PX_PER_MINUTE = PX_PER_HOUR / 60;
/** Below the busiest day, so a full day still has room to click and add. */
const GRID_FOOT_PX = 40;

const noActivitiesMessage = (projects: { name: string }[]) =>
  projects.length === 1
    ? "Activities need to be added to projects before you can log time."
    : `None of your ${projects.length} projects has activities yet. Activities need to be added before you can log time.`;

type WeekTimesheetProps = {
  userId: string;
  /** A day whose week to open first, from a link. */
  startingDay?: string;
  welcome?: ReactNode;
};

export const WeekTimesheet = ({
  userId,
  startingDay,
  welcome,
}: WeekTimesheetProps) => {
  const {
    dailyTargetMinutes,
    timezone,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useWorkSettings();

  const { weekStart, showWeekOf } = useShownWeek(startingDay);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [absenceModal, setAbsenceModal] = useState<AbsenceModalState | null>(
    null,
  );
  const [nonWorkDayDate, setNonWorkDayDate] = useState<Date | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const dateFrom = toISODate(weekStart);
  const dateTo = toISODate(getWeekEnd(weekStart));
  const todayIso = todayISODate(timezone);

  const {
    items: timelogs,
    actions,
    isLoading: isLoadingLogs,
    isError: isLogsError,
    isPlaceholderData: isShowingPreviousWeek,
    refetch: refetchLogs,
  } = useTimelogs({
    userId,
    dateFrom,
    dateTo,
  });

  const {
    items: absences,
    actions: absenceActions,
    isLoading: isLoadingAbsences,
    isError: isAbsencesError,
    refetch: refetchAbsences,
  } = useAbsences({
    userId,
    dateFrom,
    dateTo,
  });

  const {
    items: pickerItems,
    isLoading: isLoadingPicker,
    isError: isPickerError,
    refetch: refetchPicker,
  } = useAssignableActivities();

  const {
    data: ownProjects,
    isLoading: isLoadingOwnProjects,
    isError: isOwnProjectsError,
    refetch: refetchOwnProjects,
  } = useOwnProjects();

  const {
    expectedMinutes,
    expectedByDate,
    isLoading: isLoadingExpected,
    isError: isExpectedError,
    refetch: refetchExpected,
  } = useExpectedHours({ dateFrom, dateTo });

  // An absence is frozen whole once any of its days locks, so its months count.
  const lockRange = lockLookupRange(dateFrom, dateTo, absences, todayIso);
  const {
    isLocked,
    isEditable,
    isError: isLocksError,
    refetch: refetchLocks,
  } = useLockedDates(lockRange.dateFrom, lockRange.dateTo);
  const graceMonth = useGraceMonth();

  const { items: plannedEntries } = usePlanningEntries({
    userId,
    dateFrom,
    dateTo,
  });

  const plannedByDate = useMemo(() => {
    const map: Record<string, PlanningEntry[]> = {};

    plannedEntries.forEach((entry) => {
      (map[entry.date] ??= []).push(entry);
    });

    return map;
  }, [plannedEntries]);

  const timelogsByDate = useMemo(
    () => groupTimelogsByDate(timelogs),
    [timelogs],
  );

  const absencesByDate = useMemo(
    () => mapAbsencesByDate(absences, weekDates.map(toISODate)),
    [absences, weekDates],
  );

  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    weekDates.forEach((date) => {
      const iso = toISODate(date);

      totals[iso] = (timelogsByDate[iso] ?? []).reduce(
        (sum, log) => sum + log.minutes,
        0,
      );
    });

    return totals;
  }, [weekDates, timelogsByDate]);

  // Only the shown week's dates count, like the daily totals, so the previous
  // week kept on screen while the next one loads adds nothing.
  const { billableMinutes, nonBillableMinutes } = useMemo(() => {
    let billable = 0;
    let nonBillable = 0;

    weekDates.forEach((date) => {
      (timelogsByDate[toISODate(date)] ?? []).forEach((log) => {
        if (log.isBillable) {
          billable += log.minutes;
        } else {
          nonBillable += log.minutes;
        }
      });
    });

    return {
      billableMinutes: billable,
      nonBillableMinutes: nonBillable,
    };
  }, [weekDates, timelogsByDate]);

  const daysOff = weekDates
    .filter((date) => !isWeekend(date) && absencesByDate[toISODate(date)])
    .map(
      (date) =>
        `${formatWeekdayLabel(date)} ${date.getDate()}, ${ABSENCE_TYPE_LABELS[
          absencesByDate[toISODate(date)].type
        ].toLowerCase()}`,
    );
  const weekendMinutes = weekDates
    .filter(isWeekend)
    .reduce((sum, date) => sum + (dailyTotals[toISODate(date)] ?? 0), 0);
  const isCurrentWeek = dateFrom <= todayIso && todayIso <= dateTo;

  const tallestDayPx = Math.max(
    dailyTargetMinutes * PX_PER_MINUTE,
    ...Object.values(timelogsByDate).map((logs) =>
      stackHeight(logs, (log) => log.minutes, PX_PER_MINUTE),
    ),
  );

  const minGridHeightPx = tallestDayPx + GRID_FOOT_PX;

  // Plans never fall on a weekend, so the confirmation needs no project.
  const openCreate = (date: Date, plannedProjectId?: string) => {
    if (isWeekend(date)) {
      setNonWorkDayDate(date);
      return;
    }

    setModalState({ date: toISODate(date), plannedProjectId });
  };

  const confirmNonWorkDay = () => {
    if (!nonWorkDayDate) return;

    setModalState({
      date: toISODate(nonWorkDayDate),
    });
    setNonWorkDayDate(null);
  };

  const openAbsence = (date: Date) => {
    const iso = toISODate(date);
    setAbsenceModal({ date: iso, absence: absencesByDate[iso] });
  };

  const openNewAbsence = () =>
    setAbsenceModal({
      date: newAbsenceStartDate({
        today: companyToday(timezone),
        weekStart,
        isCurrentWeek,
        isEditable,
      }),
    });

  const openEdit = (timelog: TimeLog) => {
    setModalState({
      date: timelog.date,
      timelog,
    });
  };

  const closeModal = () => setModalState(null);

  const retry = () => {
    void refetchLogs();
    void refetchPicker();
    void refetchSettings();
    void refetchAbsences();
    void refetchExpected();
    void refetchOwnProjects();
    void refetchLocks();
  };

  const hasError =
    isLogsError ||
    isPickerError ||
    isSettingsError ||
    isAbsencesError ||
    isExpectedError ||
    isOwnProjectsError ||
    isLocksError;

  const content = timesheetContentFor({
    loggableActivities: pickerItems.length,
    ownProjects: ownProjects?.count ?? 0,
    timeLogs: timelogs.length,
    absences: absences.length,
    isCurrentWeek,
  });
  const showsFigures =
    !hasError &&
    showsWeekFigures({
      loggableActivities: pickerItems.length,
      timeLogs: timelogs.length,
    });

  const header = <PageHeader title="Timesheet" hideTitle />;

  const addAbsenceButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={openNewAbsence}
      className="max-sm:size-10 max-sm:px-0"
    >
      <CalendarOff className="size-4" aria-hidden />
      <span className="max-sm:sr-only">Add absence</span>
    </Button>
  );

  const openedAbsence = absenceModal?.absence;
  // Locked as a whole once any of its days is, like the day column.
  const isOpenedAbsenceLocked =
    !!openedAbsence &&
    isRangeLocked(isLocked, openedAbsence.startDate, openedAbsence.endDate);
  const closeAbsence = () => setAbsenceModal(null);

  const absenceForm =
    absenceModal &&
    (openedAbsence && isOpenedAbsenceLocked ? (
      <LockedAbsenceModal absence={openedAbsence} onClose={closeAbsence} />
    ) : (
      <AbsenceFormModal
        open
        onClose={closeAbsence}
        userId={userId}
        date={absenceModal.date}
        absence={openedAbsence}
        onCreate={(payload) => absenceActions.create.mutateAsync(payload)}
        onUpdate={(id, data) => absenceActions.update.mutateAsync({ id, data })}
        onDelete={(id) => absenceActions.delete.mutateAsync(id)}
        isSaving={
          absenceActions.create.isPending || absenceActions.update.isPending
        }
        isDeleting={absenceActions.delete.isPending}
      />
    ));

  if (
    isLoadingSettings ||
    isLoadingLogs ||
    isLoadingPicker ||
    isLoadingAbsences ||
    isLoadingExpected ||
    isLoadingOwnProjects
  ) {
    return (
      <>
        {header}
        <LoadingState
          title="Loading your timesheet"
          description="Fetching your week and workspace settings."
        />
      </>
    );
  }

  if (!hasError && content !== "week") {
    return (
      <>
        {header}

        {welcome && <div className="mb-6 empty:hidden">{welcome}</div>}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <WeekNav weekStart={weekStart} onWeekChange={showWeekOf} />

          <div className="flex flex-wrap items-center gap-3">
            <BackToThisWeekButton
              weekStart={weekStart}
              onWeekChange={showWeekOf}
            />
            {addAbsenceButton}
          </div>
        </div>

        {content === "notOnProjects" ? (
          <EmptyState
            title="You're not on any projects yet"
            description="Once a manager adds you to a project, you'll be able to log time against it here."
            icon={<FolderKanban />}
          />
        ) : (
          <EmptyState
            title="No activities yet"
            description={noActivitiesMessage(ownProjects?.results ?? [])}
            icon={<ListTodo />}
          />
        )}

        {absenceForm}
      </>
    );
  }

  return (
    <>
      {header}

      {welcome && <div className="mb-6 empty:hidden">{welcome}</div>}

      <div className="@container border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-5">
          <div className="flex items-center gap-2">
            <WeekNav weekStart={weekStart} onWeekChange={showWeekOf} />
            <BackToThisWeekButton
              weekStart={weekStart}
              onWeekChange={showWeekOf}
            />
          </div>

          {showsFigures && (
            <WeekSummary
              billableMinutes={billableMinutes}
              nonBillableMinutes={nonBillableMinutes}
              expectedMinutes={expectedMinutes}
              daysOff={daysOff}
              weekendMinutes={weekendMinutes}
              className="order-last w-full @5xl:order-none @5xl:ml-auto @5xl:w-auto"
            />
          )}

          {!hasError && (
            <div className="ml-auto flex items-center gap-2 @5xl:ml-0">
              {graceMonth?.editableUntil && (
                <GraceMonthNote
                  month={graceMonth.month}
                  editableUntil={graceMonth.editableUntil}
                />
              )}
              {addAbsenceButton}
            </div>
          )}
        </div>
      </div>

      {hasError && (
        <ErrorState
          title="We couldn't load your timesheet"
          description="This week is unavailable right now."
          onRetry={retry}
        />
      )}

      {!hasError && (
        <>
          <div className="grid grid-cols-7 border-b border-border">
            {weekDates.map((date) => (
              <WeekHeaderDay
                key={toISODate(date)}
                date={date}
                isToday={toISODate(date) === todayIso}
                totalMinutes={dailyTotals[toISODate(date)] ?? 0}
                targetMinutes={expectedByDate[toISODate(date)]}
                isLocked={isLocked(toISODate(date))}
              />
            ))}
          </div>

          <div
            aria-busy={isShowingPreviousWeek}
            className={cn(
              "grid flex-1 grid-cols-7 transition-opacity",
              isShowingPreviousWeek && "opacity-60",
            )}
            style={{ minHeight: minGridHeightPx }}
          >
            {weekDates.map((date) => {
              const iso = toISODate(date);
              const absence = absencesByDate[iso];
              const isAbsenceLocked =
                !!absence &&
                isRangeLocked(isLocked, absence.startDate, absence.endDate);

              return (
                <DayColumn
                  key={iso}
                  date={date}
                  timelogs={timelogsByDate[iso] ?? []}
                  plannedEntries={plannedByDate[iso] ?? []}
                  absence={absence}
                  isAbsenceLocked={isAbsenceLocked}
                  totalMinutes={dailyTotals[iso] ?? 0}
                  pixelsPerMinute={PX_PER_MINUTE}
                  expectedMinutes={expectedByDate[iso]}
                  isLocked={isLocked(iso)}
                  isEditable={isEditable(iso) && !isAbsenceLocked}
                  // Time is logged only for a day that has happened.
                  canLogTime={iso <= todayIso}
                  onAddClick={openCreate}
                  onAbsenceClick={openAbsence}
                  onEntryClick={openEdit}
                />
              );
            })}
          </div>
        </>
      )}

      <NonWorkDayConfirm
        date={nonWorkDayDate}
        onClose={() => setNonWorkDayDate(null)}
        onConfirm={confirmNonWorkDay}
      />

      {absenceForm}

      {modalState && (
        <TimeLogFormModal
          open
          onClose={closeModal}
          date={modalState.date}
          rememberKey={lastEntryChoiceKey(userId, userId)}
          plannedProjectId={modalState.plannedProjectId}
          timelog={modalState.timelog}
          pickerItems={pickerItems}
          onCreate={(payload) => actions.create.mutateAsync(payload)}
          onUpdate={(id, data) =>
            actions.update.mutateAsync({
              id,
              data,
            })
          }
          onDelete={(id) => actions.delete.mutateAsync(id)}
          isSaving={actions.create.isPending || actions.update.isPending}
          isDeleting={actions.delete.isPending}
        />
      )}
    </>
  );
};
