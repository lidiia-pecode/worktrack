"use client";

import { useMemo, useState } from "react";

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
import { WEEKLY_TARGET_MINUTES } from "@/lib/consts";

import Container from "../layout/Container";
import { WeekNav } from "./WeekNav";
import { DayColumn } from "./DayColumn";
import { TimeLogFormModal } from "./TimeLogFormModal";

type ModalState = {
  date: string;
  timelog?: Timelog;
};

export const WeekTimesheet = () => {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [modalState, setModalState] = useState<ModalState | null>(null);

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

  const totalMinutes = (data?.results ?? []).reduce(
    (sum, log) => sum + log.time,
    0,
  );

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
          const today = isToday(date);
          const weekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <div
              key={date.toISOString()}
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
            </div>
          );
        })}
      </div>

      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-7 h-full">
          {weekDates.map((date) => (
            <DayColumn
              key={date.toISOString()}
              date={date}
              timelogs={timelogsByDate[toISODate(date)] ?? []}
              onAddClick={openCreate}
              onEntryClick={openEdit}
            />
          ))}
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
