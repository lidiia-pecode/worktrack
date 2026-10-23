"use client";

import { useMemo } from "react";

import { Absence, PeopleReportRow } from "@/types";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useTeamTimeSummary } from "@/hooks/useTeamTimeSummary";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { cn } from "@/lib/utils/cn";
import {
  formatDuration,
  formatWeekdayLabel,
  fromISODate,
  isWeekend,
} from "@/lib/utils/date";
import { DateRange } from "@/lib/utils/report-period";
import { personDays, ReportDay } from "@/lib/utils/report-overview";

import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";

const DAY_STYLES: Record<ReportDay["kind"], string> = {
  logged: "border-brand/25 bg-brand-subtle",
  off: "border-border bg-stripes-brand",
  withoutTime: "border-dashed border-muted-foreground/50 bg-card",
  today: "border-border bg-card",
  nothingExpected: "border-border bg-card",
};

const DAY_LEGEND: { kind: ReportDay["kind"]; label: string }[] = [
  { kind: "logged", label: "Logged" },
  { kind: "off", label: "Day off" },
  { kind: "withoutTime", label: "No time logged" },
];

const absenceOn = (absences: Absence[], date: string) =>
  absences.find(
    (absence) => absence.startDate <= date && absence.endDate >= date,
  );

const dayLabel = (date: string) =>
  `${formatWeekdayLabel(fromISODate(date))} ${fromISODate(date).getDate()}`;

type PersonDayGridProps = {
  person: PeopleReportRow;
  absences: ReturnType<typeof useAllAbsencesQuery>;
  range: DateRange;
  countedUntil: string | null;
};

/**
 * A person's working days, Monday to Friday in columns so the grid reads week
 * by week; a weekend day with time is listed under it.
 */
export const PersonDayGrid = ({
  person,
  absences,
  range,
  countedUntil,
}: PersonDayGridProps) => {
  // Only this person's days, not the whole team's.
  const summary = useTeamTimeSummary({ ...range, userId: person.userId });

  const days = useMemo(() => {
    const row = summary.rows.find((entry) => entry.user.id === person.userId);

    return personDays({
      ...range,
      countedUntil,
      loggedByDate: new Map(
        (row?.days ?? []).map((day) => [day.date, day.minutes]),
      ),
      isOff: (date) => Boolean(absenceOn(absences.items, date)),
      daysWithoutTime: new Set(person.daysWithoutTime),
    });
  }, [summary.rows, absences.items, person, range, countedUntil]);

  // Days off come from the absences, so the grid waits for both.
  if (summary.isLoading || absences.isLoading) {
    return <LoadingState size="compact" title="Loading the days…" />;
  }
  if (summary.isError || absences.isError) {
    return (
      <ErrorState
        size="compact"
        title="We couldn't load the days"
        onRetry={() => {
          if (summary.isError) void summary.refetch();
          if (absences.isError) void absences.refetch();
        }}
      />
    );
  }

  const offLabel = (date: string) => {
    const absence = absenceOn(absences.items, date);
    return absence ? ABSENCE_TYPE_SHORT_LABELS[absence.type] : "Off";
  };
  const weekdays = days.filter((day) => !isWeekend(fromISODate(day.date)));
  const weekendDays = days.filter((day) => isWeekend(fromISODate(day.date)));

  return (
    <>
      <ul aria-label="Days" className="grid grid-cols-5 gap-1.5">
        {weekdays.map((day) => (
          <li
            key={day.date}
            // Monday is column 1, so a new week starts a new row.
            style={{ gridColumnStart: fromISODate(day.date).getDay() }}
            className={cn(
              "flex flex-col gap-0.5 rounded-lg border px-2 py-1.5",
              DAY_STYLES[day.kind],
            )}
          >
            <span className="text-2xs text-muted-foreground">
              {dayLabel(day.date)}
            </span>
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                day.kind !== "logged" && "text-muted-foreground",
              )}
            >
              {day.kind === "logged"
                ? formatDuration(day.minutes)
                : day.kind === "off"
                  ? offLabel(day.date)
                  : day.kind === "withoutTime"
                    ? "No time"
                    : day.kind === "today"
                      ? "Today"
                      : "—"}
            </span>
          </li>
        ))}
      </ul>
      {weekendDays.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Also logged at the weekend:{" "}
          {weekendDays
            .map(
              (day) => `${dayLabel(day.date)} · ${formatDuration(day.minutes)}`,
            )
            .join(", ")}
        </p>
      )}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {DAY_LEGEND.map(({ kind, label }) => (
          <li key={kind} className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-3 rounded-sm border", DAY_STYLES[kind])}
              aria-hidden
            />
            {label}
          </li>
        ))}
      </ul>
    </>
  );
};
