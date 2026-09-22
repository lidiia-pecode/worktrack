"use client";

import { useMemo, useRef, useState } from "react";

import { CalendarOff, FolderKanban } from "lucide-react";

import { useTimelogs } from "@/hooks/useTimelogs";
import { useAbsences } from "@/hooks/useAbsences";
import { useExpectedHours } from "@/hooks/useExpectedHours";
import { useAssignableActivities } from "@/hooks/useAssignableActivities";
import { Absence, TimeLog } from "@/types";
import {
  formatDuration,
  getWeekDates,
  getWeekStart,
  isWeekend,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { mapAbsencesByDate } from "@/lib/utils/absence";

import Container from "../layout/Container";
import { ConfirmModal } from "../shared/ConfirmModal";
import { EmptyState } from "../shared/EmptyState";
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
const WEEK_PAGE_SIZE = 500;

const NON_WORK_DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

type WeekTimesheetProps = {
  userId: string;
};

export const WeekTimesheet = ({ userId }: WeekTimesheetProps) => {
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

  const dateFrom = toISODate(weekDates[0]);
  const dateTo = toISODate(weekDates[6]);

  const {
    items: timelogs,
    actions,
    isLoading: isLoadingLogs,
    isError: isLogsError,
    isPlaceholderData: isShowingPreviousWeek,
    refetch: refetchLogs,
  } = useTimelogs(1, {
    dateFrom,
    dateTo,
    pageSize: WEEK_PAGE_SIZE,
  });

  const {
    items: absences,
    actions: absenceActions,
    isLoading: isLoadingAbsences,
    isError: isAbsencesError,
    refetch: refetchAbsences,
  } = useAbsences(1, {
    // Own absences only. A manager may read their team's, and this is their
    // own week — somebody else's holiday must not read as theirs.
    userId,
    dateFrom,
    dateTo,
    pageSize: WEEK_PAGE_SIZE,
  });

  const {
    items: pickerItems,
    isLoading: isLoadingPicker,
    isError: isPickerError,
    refetch: refetchPicker,
  } = useAssignableActivities();

  const {
    expectedMinutes,
    expectedToDateMinutes,
    isLoading: isLoadingExpected,
    isError: isExpectedError,
    refetch: refetchExpected,
  } = useExpectedHours({ dateFrom, dateTo });

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

  const todayIso = todayISODate(timezone);

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
  };

  const hasError =
    isLogsError ||
    isPickerError ||
    isSettingsError ||
    isAbsencesError ||
    isExpectedError;

  // Someone on no project can still be on holiday, so an absence is enough to
  // show the week rather than the "not on any projects" state.
  const isUnassigned =
    pickerItems.length === 0 && timelogs.length === 0 && absences.length === 0;

  if (
    isLoadingSettings ||
    isLoadingLogs ||
    isLoadingPicker ||
    isLoadingAbsences ||
    isLoadingExpected
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

  return (
    <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
      <div className="border-b border-border">
        <div className="flex items-center justify-between py-3 pr-3">
          <WeekNav weekStart={weekStart} onWeekChange={setAnchorDate} />

          {!hasError && (
            <div className="flex items-center gap-2 text-sm">
              <span>Time logged:</span>

              <span className="font-medium text-foreground">
                {formatDuration(totalMinutes)}
              </span>

              <span className="text-muted-foreground/50">/</span>

              <span className="text-muted-foreground">
                {formatDuration(expectedMinutes)}
              </span>

              {behindMinutes > 0 && (
                <Badge
                  variant="warning"
                  title={`Behind by ${formatDuration(behindMinutes)} on the days so far`}
                  className="px-1.5 py-0.2 text-[10px] font-medium"
                >
                  −{formatDuration(behindMinutes)}
                </Badge>
              )}
            </div>
          )}
        </div>

        {!hasError && (
          <div className="px-3 pb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openNewAbsence}
            >
              <CalendarOff className="size-4" />
              Add absence
            </Button>
          </div>
        )}

        {!hasError && (
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

      {!hasError && isUnassigned && (
        <div className="p-6">
          <EmptyState
            title="You're not on any projects yet"
            description="Once a manager adds you to a project, you'll be able to log time against it here."
            icon={<FolderKanban />}
          />
        </div>
      )}

      {!hasError && !isUnassigned && (
        <>
          <div className="grid grid-cols-7 border-b border-border">
            {weekDates.map((date) => (
              <WeekHeaderDay
                key={toISODate(date)}
                date={date}
                isToday={toISODate(date) === todayIso}
                totalMinutes={dailyTotals[toISODate(date)] ?? 0}
                targetMinutes={dailyTargetMinutes}
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

                  return (
                    <DayColumn
                      key={iso}
                      date={date}
                      timelogs={timelogsByDate[iso] ?? []}
                      absence={absencesByDate[iso]}
                      totalMinutes={dailyTotals[iso] ?? 0}
                      pixelsPerMinute={PX_PER_MINUTE}
                      expectedMinutes={dailyTargetMinutes}
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
