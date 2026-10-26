"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Absence, PeopleReportRow, ReportRange } from "@/types";
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
  range: ReportRange;
  countedUntil: string | null;
  /** Where a working day with no time leads, when it leads anywhere. */
  dayWithoutTimeHref?: (date: string) => string;
};

/**
 * A person's working days, Monday to Friday in columns so the grid reads week
 * by week; a weekend day with time is listed under it.
 */
export const PersonDayGrid = ({
  person,
  range,
  countedUntil,
  dayWithoutTimeHref,
}: PersonDayGridProps) => {
  // Only this person's days, not the whole team's.
  const summary = useTeamTimeSummary({ ...range, userId: person.userId });
  const absences = useAllAbsencesQuery({ ...range, userId: person.userId });

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
        {weekdays.map((day) => {
          const href =
            day.kind === "withoutTime" && dayWithoutTimeHref?.(day.date);
          const content = (
            <>
              <span className="text-2xs text-muted-foreground">
                {dayLabel(day.date)}
              </span>
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  href
                    ? "text-brand underline underline-offset-2"
                    : day.kind !== "logged" && "text-muted-foreground",
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
            </>
          );
          const dayStyle = cn(
            "flex h-full flex-col gap-0.5 rounded-lg border px-2 py-1.5",
            DAY_STYLES[day.kind],
          );

          return (
            <li
              key={day.date}
              // Monday is column 1, so a new week starts a new row.
              style={{ gridColumnStart: fromISODate(day.date).getDay() }}
            >
              {href ? (
                <Link
                  href={href}
                  aria-label={`${dayLabel(day.date)}: no time logged, open its week`}
                  className={cn(
                    dayStyle,
                    "border-brand/50 transition-colors hover:border-brand hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div className={dayStyle}>{content}</div>
              )}
            </li>
          );
        })}
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
