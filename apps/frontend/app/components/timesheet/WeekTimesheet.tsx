"use client";

import { useMemo, useRef, useState } from "react";

import { useTimelogs } from "@/hooks/useTimelogs";
import { useMyProjectActivities } from "@/hooks/useMyProjectActivities";
import { TimeLog } from "@/types";
import {
  formatDuration,
  getWeekDates,
  getWeekStart,
  isWeekend,
  toISODate,
  todayISODate,
} from "@/lib/utils/date";
import { useWorkSettings } from "@/hooks/useWorkSettings";

import Container from "../layout/Container";
import { LoadingState } from "../shared/LoadingState";
import { WeekNav } from "./components/WeekNav";
import { DayColumn } from "./components/DayColumn";
import { TimeLogFormModal } from "./components/TimeLogFormModal";
import { WeekHeaderDay } from "./components/WeekHeaderDay";
import { WeekProgressBar } from "./components/WeekProgressBar";

type ModalState = {
  date: string;
  timelog?: TimeLog;
};

const PX_PER_HOUR = 56;
const PX_PER_MINUTE = PX_PER_HOUR / 60;
const WEEK_PAGE_SIZE = 500;

export const WeekTimesheet = () => {
  const {
    weekStartDay,
    dailyTargetMinutes,
    timezone,
    isLoading: isLoadingSettings,
  } = useWorkSettings();

  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekStart = useMemo(
    () => getWeekStart(anchorDate, weekStartDay),
    [anchorDate, weekStartDay],
  );

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const dateFrom = toISODate(weekDates[0]);
  const dateTo = toISODate(weekDates[6]);

  const { items: timelogs, actions } = useTimelogs(1, {
    dateFrom,
    dateTo,
    pageSize: WEEK_PAGE_SIZE,
  });

  const { items: pickerItems } = useMyProjectActivities();

  const timelogsByDate = useMemo(() => {
    const map: Record<string, TimeLog[]> = {};

    timelogs.forEach((log) => {
      (map[log.date] ??= []).push(log);
    });

    return map;
  }, [timelogs]);

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

  const weeklyTargetMinutes = useMemo(
    () => dailyTargetMinutes * weekDates.filter((d) => !isWeekend(d)).length,
    [dailyTargetMinutes, weekDates],
  );

  const todayIso = todayISODate(timezone);

  const maxDailyMinutes = Math.max(
    dailyTargetMinutes,
    ...Object.values(dailyTotals),
  );

  const gridHeightPx = maxDailyMinutes * PX_PER_MINUTE + 100;

  const openCreate = (date: Date) => {
    if (isWeekend(date)) {
      const confirmed = window.confirm("Log time on a non-work day?");

      if (!confirmed) return;
    }

    setModalState({
      date: toISODate(date),
    });
  };

  const openEdit = (timelog: TimeLog) => {
    setModalState({
      date: timelog.date,
      timelog,
    });
  };

  const closeModal = () => setModalState(null);

  if (isLoadingSettings) {
    return (
      <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
        <LoadingState
          title="Loading your timesheet"
          description="Fetching your workspace settings."
        />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col p-0 sm:pr-0 lg:pr-0">
      <div className="border-b border-zinc-200">
        <div className="flex items-center justify-between py-3 pr-3">
          <WeekNav weekStart={weekStart} onWeekChange={setAnchorDate} />

          <div className="flex items-center gap-2 text-sm">
            <span>Time logged:</span>

            <span className="font-medium text-zinc-900">
              {formatDuration(totalMinutes)}
            </span>

            <span className="text-zinc-300">/</span>

            <span className="text-zinc-500">
              {formatDuration(weeklyTargetMinutes)}
            </span>
          </div>
        </div>

        <div className="px-3 pb-3">
          <WeekProgressBar
            billableMinutes={billableMinutes}
            nonBillableMinutes={nonBillableMinutes}
            plannedMinutes={weeklyTargetMinutes}
          />
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-zinc-200">
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

      <div ref={scrollRef} className="flex-1">
        <div className="relative" style={{ height: gridHeightPx }}>
          <div className="grid h-full grid-cols-7">
            {weekDates.map((date) => {
              const iso = toISODate(date);

              return (
                <DayColumn
                  key={iso}
                  date={date}
                  timelogs={timelogsByDate[iso] ?? []}
                  totalMinutes={dailyTotals[iso] ?? 0}
                  pixelsPerMinute={PX_PER_MINUTE}
                  plannedMinutes={dailyTargetMinutes}
                  onAddClick={openCreate}
                  onEntryClick={openEdit}
                />
              );
            })}
          </div>
        </div>
      </div>

      {modalState && (
        <TimeLogFormModal
          isOpen
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
