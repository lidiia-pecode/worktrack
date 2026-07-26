"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useTimelogs } from "@/hooks/useTimelogs";
import { useMyProjectActivities } from "@/hooks/useMyProjectActivities";
import { Timelog } from "@/types";
import { formatDuration, toISODate } from "@/lib/date";
import {
  formatWeekdayLabel,
  getWeekDates,
  getWeekStart,
  isToday,
} from "@/lib/week";
import { DAILY_TARGET_MINUTES, WEEKLY_TARGET_MINUTES } from "@/lib/consts";

import Container from "../layout/Container";
import { WeekNav } from "./WeekNav";
import { DayColumn } from "./DayColumn";
import { TimeLogFormModal } from "./TimeLogFormModal";

type ModalState = {
  date: string;
  timelog?: Timelog;
};

// How many pixels represent one hour of logged time. Shared by the grid,
// the 8h target line and every DayColumn so everything stays proportional.
// TODO: move alongside DAILY_TARGET_MINUTES in @/lib/consts once that file
// is touched again.
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

  // The grid is at least as tall as the 8h baseline; a day logging more than
  // that stretches the whole row so every column stays proportionally
  // comparable, and the wrapper below scrolls to reveal it.
  const maxDailyMinutes = Math.max(
    DAILY_TARGET_MINUTES,
    ...Object.values(dailyTotals),
  );
  const gridHeightPx = maxDailyMinutes * PX_PER_MINUTE;
  const targetLineOffset = DAILY_TARGET_MINUTES * PX_PER_MINUTE;

  // Keep the 8h baseline in view by default — entries stack up from the
  // bottom, so anchoring scroll to the bottom shows the "normal" range and
  // lets the person scroll up to see overtime.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [gridHeightPx, weekStart]);

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
    <Container className="h-[calc(100vh-120px)] max-w-1000 p-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <WeekNav weekStart={weekStart} onWeekChange={setWeekStart} />

        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-zinc-900">
            {formatDuration(totalMinutes)}
          </span>

          <span className="text-zinc-300">/</span>

          <span className="text-zinc-500">
            {formatDuration(WEEKLY_TARGET_MINUTES)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-zinc-200">
        {weekDates.map((date) => {
          const iso = toISODate(date);
          const today = isToday(date);
          const weekend = date.getDay() === 0 || date.getDay() === 6;
          const dayTotal = dailyTotals[iso] ?? 0;
          const isOverTarget = dayTotal > DAILY_TARGET_MINUTES;

          return (
            <div
              key={iso}
              className={`
                py-2 text-center border-r border-zinc-100 last:border-r-0
                ${weekend ? "bg-zinc-50" : ""}
              `}
            >
              <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                {formatWeekdayLabel(date)}
              </p>

              <p
                className={`
                  text-sm font-semibold mt-0.5
                  ${today ? "text-blue-600" : "text-zinc-700"}
                `}
              >
                {date.getDate()}
              </p>

              <p
                className={`
                  text-[10px] mt-0.5 font-medium
                  ${isOverTarget ? "text-amber-600" : "text-zinc-400"}
                `}
              >
                {dayTotal > 0 ? formatDuration(dayTotal) : "—"}
              </p>
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="relative" style={{ height: gridHeightPx }}>
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-zinc-300"
            style={{ bottom: targetLineOffset }}
          >
            <span className="absolute -top-2.5 right-2 rounded bg-white px-1.5 text-[10px] font-medium text-zinc-400">
              8h target
            </span>
          </div>

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
