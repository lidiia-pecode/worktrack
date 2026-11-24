"use client";

import { useCallback, useMemo } from "react";

import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useLockedDates } from "@/hooks/useReportingPeriods";
import { useAllTimeLogsQuery } from "@/hooks/useTimelogs";
import { shiftISODate } from "@/lib/utils/date";

/**
 * The days a whole-day absence can't take, as the server refuses them: time
 * logged, another of the person's absences, a locked month. Read for the
 * days the pickers show and the chosen ones.
 */
export const useUnavailableDays = ({
  userId,
  absenceId,
  from,
  to,
  enabled,
}: {
  userId: string;
  /** The absence being edited, whose own days stay free. */
  absenceId?: string;
  from: string;
  to: string;
  enabled: boolean;
}) => {
  // The months these days are in, which can be outside the page's own.
  const locks = useLockedDates(from, to);
  const range = { userId, dateFrom: from, dateTo: to };
  const logs = useAllTimeLogsQuery(range, { enabled });
  const others = useAllAbsencesQuery(range, { enabled });
  const { isLocked } = locks;
  const timelogs = logs.items;
  const absences = others.items;
  // Read for these very days: not loading, failed, or kept from other days.
  const isKnown =
    !locks.isLoading &&
    !locks.isError &&
    [logs, others].every(
      (list) => !list.isLoading && !list.isError && !list.isPlaceholderData,
    );

  const takenDays = useMemo(() => {
    const days = new Set(timelogs.map((log) => log.date));
    absences
      .filter((other) => other.id !== absenceId)
      .forEach((other) => {
        for (
          let day = other.startDate;
          day <= other.endDate;
          day = shiftISODate(day, 1)
        ) {
          days.add(day);
        }
      });
    return days;
  }, [timelogs, absences, absenceId]);

  const isUnavailable = useCallback(
    (date: string) => isLocked(date) || takenDays.has(date),
    [isLocked, takenDays],
  );

  return { isUnavailable, isKnown: enabled && isKnown };
};
