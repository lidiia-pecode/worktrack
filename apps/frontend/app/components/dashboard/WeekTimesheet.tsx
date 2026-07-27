"use client";

import { useMemo, useRef, useState } from "react";

import { useTimelogs } from "@/hooks/useTimelogs";
import { useMyProjectActivities } from "@/hooks/useMyProjectActivities";
import { Timelog } from "@/types";
import { formatDuration, toISODate } from "@/lib/date";
import { getWeekDates, getWeekStart } from "@/lib/week";

import Container from "../layout/Container";
import { WeekNav } from "./components/WeekNav";
import { DayColumn } from "./components/DayColumn";
import { TimeLogFormModal } from "./components/TimeLogFormModal";
import { WeekHeaderDay } from "./components/WeekHeaderDay";
import { WeekProgressBar } from "./components/WeekProgressBar";

type ModalState = {
  date: string;
  timelog?: Timelog;
};

const DAILY_TARGET_MINUTES = 8 * 60;
const WEEKLY_TARGET_MINUTES = DAILY_TARGET_MINUTES * 5;
const PX_PER_HOUR = 56;
const PX_PER_MINUTE = PX_PER_HOUR / 60;

export const WeekTimesheet = () => {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const dateFrom = toISODate(weekDates[0]);
  const dateTo = toISODate(weekDates[6]);

  const { data, createTimelog, updateTimelog, deleteTimelog } = useTimelogs({
    dateFrom,
    dateTo,
  });

  const { items: pickerItems } = useMyProjectActivities();

  const timelogsByDate = useMemo(() => {
    const map: Record<string, Timelog[]> = {};

    (data?.results ?? []).forEach((log) => {
      (map[log.date] ??= []).push(log);
    });

    return map;
  }, [data?.results]);

  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    weekDates.forEach((date) => {
      const iso = toISODate(date);
      totals[iso] = (timelogsByDate[iso] ?? []).reduce(
        (sum, log) => sum + log.time,
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

    (data?.results ?? []).forEach((log) => {
      if (log.isBillable) {
        billable += log.time;
      } else {
        nonBillable += log.time;
      }
    });

    return { billableMinutes: billable, nonBillableMinutes: nonBillable };
  }, [data?.results]);

  const maxDailyMinutes = Math.max(
    DAILY_TARGET_MINUTES,
    ...Object.values(dailyTotals),
  );
  const gridHeightPx = maxDailyMinutes * PX_PER_MINUTE + 100;

  const openCreate = (date: Date) => {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    if (isWeekend) {
      const confirmed = window.confirm("Log time on a non-work day?");

      if (!confirmed) return;
    }

    setModalState({
      date: toISODate(date),
    });
  };

  const openEdit = (timelog: Timelog) =>
    setModalState({
      date: timelog.date,
      timelog,
    });

  const closeModal = () => setModalState(null);

  return (
    <Container className="p-0 sm:pr-0 lg:pr-0 flex flex-col">
      <div className="border-b border-zinc-200">
        <div className="flex items-center justify-between py-3 pr-3">
          <WeekNav weekStart={weekStart} onWeekChange={setWeekStart} />

          <div className="flex items-center gap-2 text-sm">
            <span>Time logged:</span>

            <span className="font-medium text-zinc-900">
              {formatDuration(totalMinutes)}
            </span>

            <span className="text-zinc-300">/</span>

            <span className="text-zinc-500">
              {formatDuration(WEEKLY_TARGET_MINUTES)}
            </span>
          </div>
        </div>

        <div className="px-3 pb-3">
          <WeekProgressBar
            billableMinutes={billableMinutes}
            nonBillableMinutes={nonBillableMinutes}
            plannedMinutes={WEEKLY_TARGET_MINUTES}
          />
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-zinc-200">
        {weekDates.map((date) => (
          <WeekHeaderDay
            key={toISODate(date)}
            date={date}
            totalMinutes={dailyTotals[toISODate(date)] ?? 0}
            targetMinutes={DAILY_TARGET_MINUTES}
          />
        ))}
      </div>

      <div ref={scrollRef} className="flex-1">
        <div className="relative" style={{ height: gridHeightPx }}>
          <div className="grid grid-cols-7 h-full">
            {weekDates.map((date) => {
              const iso = toISODate(date);

              return (
                <DayColumn
                  key={iso}
                  date={date}
                  timelogs={timelogsByDate[iso] ?? []}
                  totalMinutes={dailyTotals[iso] ?? 0}
                  pixelsPerMinute={PX_PER_MINUTE}
                  plannedMinutes={DAILY_TARGET_MINUTES}
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
          onCreate={(payload) => createTimelog.mutateAsync(payload)}
          onUpdate={(id, data) =>
            updateTimelog.mutateAsync({
              id,
              data,
            })
          }
          onDelete={(id) => deleteTimelog.mutateAsync(id)}
          isSaving={createTimelog.isPending || updateTimelog.isPending}
          isDeleting={deleteTimelog.isPending}
        />
      )}
    </Container>
  );
};
