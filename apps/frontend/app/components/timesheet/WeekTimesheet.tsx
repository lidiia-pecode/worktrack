"use client";

import { ReactNode, useMemo, useRef, useState } from "react";

import { CalendarOff, Clock, FolderKanban, ListTodo } from "lucide-react";

import { useTimelogs } from "@/hooks/useTimelogs";
import { useGraceMonth, useLockedDates } from "@/hooks/useReportingPeriods";
import { useAbsences } from "@/hooks/useAbsences";
import { useExpectedHours } from "@/hooks/useExpectedHours";
import { useAssignableActivities } from "@/hooks/useAssignableActivities";
import { useOwnProjects } from "@/hooks/useProjects";
import { usePlanningEntries } from "@/hooks/usePlanning";
import { Absence, PlanningEntry, TimeLog } from "@/types";
import {
  formatDayMonthLabel,
  formatDuration,
  formatMonthLabel,
  getWeekDates,
  getWeekEnd,
  getWeekStart,
  isWeekend,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { mapAbsencesByDate } from "@/lib/utils/absence";
import { isRangeLocked, lockLookupRange } from "@/lib/utils/reporting-period";

import Container from "../layout/Container";
import { ConfirmModal } from "../shared/ConfirmModal";
import { EmptyState } from "../shared/EmptyState";
import { PageHeader } from "../shared/PageHeader";
import { ErrorState } from "../shared/ErrorState";
import { LoadingState } from "../shared/LoadingState";
import { WeekNav } from "../shared/week/WeekNav";
import { WeekHeaderDay } from "../shared/week/WeekHeaderDay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AbsenceFormModal } from "./components/AbsenceFormModal";
import { DayColumn } from "./components/DayColumn";
import { TimeLogFormModal } from "./components/TimeLogFormModal";
import { WeekProgressBar } from "./components/WeekProgressBar";
import { showsWeekFigures, timesheetContentFor } from "./helpers/first-run";

type ModalState = {
  date: string;
  timelog?: TimeLog;
};

type AbsenceModalState = {
  date: string;
  absence?: Absence;
};

const PX_PER_HOUR = 56;
const PX_PER_MINUTE = PX_PER_HOUR / 60;

const NON_WORK_DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const noActivitiesMessage = (projects: { name: string }[]) =>
  projects.length === 1
    ? "Activities need to be added to projects before you can log time."
    : `None of your ${projects.length} projects has activities yet. Activities need to be added before you can log time.`;

type WeekTimesheetProps = {
  userId: string;
  welcome?: ReactNode;
};

export const WeekTimesheet = ({ userId, welcome }: WeekTimesheetProps) => {
  const {
    weekStartDay,
    dailyTargetMinutes,
    timezone,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    refetch: refetchSettings,
  } = useWorkSettings();

  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [absenceModal, setAbsenceModal] = useState<AbsenceModalState | null>(
    null,
  );
  const [nonWorkDayDate, setNonWorkDayDate] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekStart = useMemo(
    () => getWeekStart(anchorDate, weekStartDay),
    [anchorDate, weekStartDay],
  );

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
    expectedToDateMinutes,
    isLoading: isLoadingExpected,
    isError: isExpectedError,
    refetch: refetchExpected,
  } = useExpectedHours({ dateFrom, dateTo });

  // An absence is frozen whole once any of its days locks, so its months count.
  const lockRange = lockLookupRange(dateFrom, dateTo, absences, todayIso);
  const { isLocked, isEditable } = useLockedDates(
    lockRange.dateFrom,
    lockRange.dateTo,
  );
  const graceMonth = useGraceMonth();

  // Context only: the timesheet works the same whether or not a plan loads.
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

  const timelogsByDate = useMemo(() => {
    const map: Record<string, TimeLog[]> = {};

    timelogs.forEach((log) => {
      (map[log.date] ??= []).push(log);
    });

    return map;
  }, [timelogs]);

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

  const totalMinutes = Object.values(dailyTotals).reduce(
    (sum, minutes) => sum + minutes,
    0,
  );

  const { billableMinutes, nonBillableMinutes } = useMemo(() => {
    let billable = 0;
    let nonBillable = 0;

    timelogs.forEach((log) => {
      if (log.isBillable) {
        billable += log.minutes;
      } else {
        nonBillable += log.minutes;
      }
    });

    return {
      billableMinutes: billable,
      nonBillableMinutes: nonBillable,
    };
  }, [timelogs]);

  const behindMinutes = Math.max(0, expectedToDateMinutes - totalMinutes);

  const maxDailyMinutes = Math.max(
    dailyTargetMinutes,
    ...Object.values(dailyTotals),
  );

  const gridHeightPx = maxDailyMinutes * PX_PER_MINUTE + 100;

  const openCreate = (date: Date) => {
    if (isWeekend(date)) {
      setNonWorkDayDate(date);
      return;
    }

    setModalState({
      date: toISODate(date),
    });
  };

  const confirmNonWorkDay = () => {
    if (!nonWorkDayDate) return;

    setModalState({
      date: toISODate(nonWorkDayDate),
    });
    setNonWorkDayDate(null);
  };

  // From a day already marked absent: edit that one.
  const openAbsence = (date: Date) => {
    const iso = toISODate(date);
    setAbsenceModal({ date: iso, absence: absencesByDate[iso] });
  };

  // From the header: always a new one, starting today, whatever today holds.
  const openNewAbsence = () => setAbsenceModal({ date: todayIso });

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
  };

  const hasError =
    isLogsError ||
    isPickerError ||
    isSettingsError ||
    isAbsencesError ||
    isExpectedError ||
    isOwnProjectsError;

  const content = timesheetContentFor({
    loggableActivities: pickerItems.length,
    ownProjects: ownProjects?.count ?? 0,
    timeLogs: timelogs.length,
    absences: absences.length,
    isCurrentWeek: dateFrom <= todayIso && todayIso <= dateTo,
  });
  const showsFigures =
    !hasError &&
    showsWeekFigures({
      loggableActivities: pickerItems.length,
      timeLogs: timelogs.length,
    });

  if (
    isLoadingSettings ||
    isLoadingLogs ||
    isLoadingPicker ||
    isLoadingAbsences ||
    isLoadingExpected ||
    isLoadingOwnProjects
  ) {
    return (
      <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
        <LoadingState
          title="Loading your timesheet"
          description="Fetching your week and workspace settings."
        />
      </Container>
    );
  }

  if (!hasError && content !== "week") {
    return (
      <section className="flex min-h-full w-full flex-col p-6">
        <PageHeader
          title="Timesheet"
          description="Record your working hours, day by day."
        />

        {welcome && <div className="mb-6 empty:hidden">{welcome}</div>}

        {/* Earlier weeks may hold time logged before, so they stay reachable. */}
        <div className="mb-4">
          <WeekNav weekStart={weekStart} onWeekChange={setAnchorDate} />
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
      </section>
    );
  }

  return (
    <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
      {welcome && (
        <div className="px-3 pt-4 pb-1 empty:hidden sm:pl-0">{welcome}</div>
      )}

      <div className="border-b border-border">
        <div className="flex items-center justify-between py-3 pr-3">
          <WeekNav weekStart={weekStart} onWeekChange={setAnchorDate} />

          {showsFigures && (
            <div className="flex items-center gap-2 text-sm">
              <span>Time logged:</span>

              <span className="font-medium text-foreground">
                {formatDuration(totalMinutes)}
              </span>

              <span className="text-muted-foreground">/</span>

              <span className="text-muted-foreground">
                {formatDuration(expectedMinutes)}
              </span>

              {behindMinutes > 0 && (
                <Badge
                  variant="warning"
                  title={`Behind by ${formatDuration(behindMinutes)} on the days so far`}
                  className="px-1.5 text-[10px] font-medium"
                >
                  -{formatDuration(behindMinutes)}
                </Badge>
              )}
            </div>
          )}
        </div>

        {!hasError && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openNewAbsence}
            >
              <CalendarOff className="size-4" />
              Add absence
            </Button>

            {graceMonth?.editableUntil && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5 text-warning-text" aria-hidden />
                {formatMonthLabel(graceMonth.month)} can still be edited until{" "}
                {formatDayMonthLabel(graceMonth.editableUntil)}.
              </p>
            )}
          </div>
        )}

        {showsFigures && (
          <div className="px-3 pb-3">
            <WeekProgressBar
              billableMinutes={billableMinutes}
              nonBillableMinutes={nonBillableMinutes}
              expectedMinutes={expectedMinutes}
            />
          </div>
        )}
      </div>

      {hasError && (
        <ErrorState
          title="We couldn't load your timesheet"
          description="Your entries for this week are unavailable right now."
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
                targetMinutes={dailyTargetMinutes}
                isLocked={isLocked(toISODate(date))}
              />
            ))}
          </div>

          <div
            ref={scrollRef}
            className="flex-1"
            aria-busy={isShowingPreviousWeek}
          >
            <div
              className={[
                "relative transition-opacity",
                isShowingPreviousWeek && "opacity-60",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ height: gridHeightPx }}
            >
              <div className="grid h-full grid-cols-7">
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
                      expectedMinutes={dailyTargetMinutes}
                      isLocked={isLocked(iso)}
                      isEditable={isEditable(iso) && !isAbsenceLocked}
                      onAddClick={openCreate}
                      onAbsenceClick={openAbsence}
                      onEntryClick={openEdit}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={!!nonWorkDayDate}
        onClose={() => setNonWorkDayDate(null)}
        onConfirm={confirmNonWorkDay}
        title="Log time on a non-work day?"
        message={
          nonWorkDayDate
            ? `${NON_WORK_DAY_LABEL.format(nonWorkDayDate)} is outside the standard work week.`
            : undefined
        }
        confirmText="Log time"
      />

      {absenceModal && (
        <AbsenceFormModal
          open
          onClose={() => setAbsenceModal(null)}
          date={absenceModal.date}
          absence={absenceModal.absence}
          onCreate={(payload) => absenceActions.create.mutateAsync(payload)}
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

      {modalState && (
        <TimeLogFormModal
          open
          onClose={closeModal}
          date={modalState.date}
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
    </Container>
  );
};
