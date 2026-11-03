"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Absence, ClosedSpell, PeopleReportRow, ReportRange } from "@/types";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { useTeamTimeSummary } from "@/hooks/useTeamTimeSummary";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { cn } from "@/lib/utils/cn";
import { CLOSED_DAY_TEXT, closedSpellOn, isClosedOn } from "@/lib/utils/user";
import {
  formatDuration,
  formatWeekdayLabel,
  fromISODate,
  isWeekend,
} from "@/lib/utils/date";
import { personDays, ReportDay } from "@/lib/utils/report-overview";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ABSENCE_PATTERN } from "../../timesheet/consts";
import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";

const KIND_STYLES: Record<ReportDay["kind"], string> = {
  logged: "border-brand/25 bg-brand-subtle",
  // The quiet fill a closed day has on Team time.
  closed: "border-border/60 bg-muted/20",
  off: cn("border-border", ABSENCE_PATTERN),
  withoutTime: "border-border bg-card",
  nothingExpected: "border-border bg-card",
  pending: "border-border",
};

// Today is ringed in the brand colour; a day to come is dashed, so dashed
// only ever means "not yet", and keeps whatever is already on it.
const WHEN_STYLES: Record<ReportDay["when"], string> = {
  past: "",
  today: "border-2 border-brand px-[7px] py-[5px]",
  future: "border-dashed border-muted-foreground/40",
};

const SWATCH = "size-3 rounded-sm border";

const NO_CLOSED_SPELLS: ClosedSpell[] = [];

const WarningDot = () => (
  <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
);

const absenceOn = (absences: Absence[], date: string) =>
  absences.find(
    (absence) => absence.startDate <= date && absence.endDate >= date,
  );

const dayLabel = (date: string) =>
  `${formatWeekdayLabel(fromISODate(date))} ${fromISODate(date).getDate()}`;

type PersonDayGridProps = {
  person: PeopleReportRow;
  range: ReportRange;
  /** A team filter closes the person's days outside the team. */
  teamId?: string;
  countedUntil: string | null;
  dayWithoutTimeHref?: (date: string) => string;
};

/**
 * A person's working days, Monday to Friday in columns so the grid reads week
 * by week; a weekend day with time is listed under it. A day the view doesn't
 * hold, another team's or after they left, is closed, as on Team time.
 */
export const PersonDayGrid = ({
  person,
  range,
  teamId,
  countedUntil,
  dayWithoutTimeHref,
}: PersonDayGridProps) => {
  // Only this person's days, not the whole team's.
  const summary = useTeamTimeSummary({
    ...range,
    userId: person.userId,
    teamId,
  });
  const absences = useAllAbsencesQuery({ ...range, userId: person.userId });
  const row = summary.rows.find((entry) => entry.user.id === person.userId);
  const closedSpells = row?.closedSpells ?? NO_CLOSED_SPELLS;

  const days = useMemo(
    () =>
      personDays({
        ...range,
        countedUntil,
        loggedByDate: new Map(
          (row?.days ?? []).map((day) => [day.date, day.minutes]),
        ),
        isClosed: (date) => isClosedOn(closedSpells, date),
        isOff: (date) => Boolean(absenceOn(absences.items, date)),
        daysWithoutTime: new Set(person.daysWithoutTime),
      }),
    [row, closedSpells, absences.items, person, range, countedUntil],
  );

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
  const closedText = (date: string) => {
    const spell = closedSpellOn(closedSpells, date);
    return spell ? CLOSED_DAY_TEXT[spell.reason] : undefined;
  };
  const dayValue = (day: ReportDay) => {
    switch (day.kind) {
      case "logged":
        return formatDuration(day.minutes);
      case "closed":
        // Said on hover and to a screen reader; the day itself stays quiet.
        return <span className="sr-only">{closedText(day.date)}</span>;
      case "off":
        return offLabel(day.date);
      case "withoutTime":
        return "No time";
      case "nothingExpected":
        return "—";
      case "pending":
        return day.when === "today" ? "Counts tomorrow" : null;
    }
  };
  const weekdays = days.filter((day) => !isWeekend(fromISODate(day.date)));
  const weekendDays = days.filter((day) => isWeekend(fromISODate(day.date)));

  const legend = [
    {
      label: "Logged",
      shows: days.some((day) => day.kind === "logged"),
      swatch: <span className={cn(SWATCH, KIND_STYLES.logged)} />,
    },
    {
      label: "Day off",
      shows: days.some((day) => day.kind === "off"),
      swatch: <span className={cn(SWATCH, KIND_STYLES.off)} />,
    },
    {
      label: "Not in this team",
      shows: closedSpells.some((spell) => spell.reason === "outside-team"),
      swatch: <span className={cn(SWATCH, KIND_STYLES.closed)} />,
    },
    {
      label: "Not employed",
      shows: closedSpells.some((spell) => spell.reason === "inactive"),
      swatch: <span className={cn(SWATCH, KIND_STYLES.closed)} />,
    },
    {
      label: "No time logged",
      shows: days.some((day) => day.kind === "withoutTime"),
      swatch: <WarningDot />,
    },
    {
      label: "Today",
      shows: days.some((day) => day.when === "today"),
      swatch: <span className={cn(SWATCH, "border-2 border-brand")} />,
    },
    {
      label: "Still to come",
      shows: days.some((day) => day.when === "future"),
      swatch: <span className={cn(SWATCH, WHEN_STYLES.future)} />,
    },
  ].filter((item) => item.shows);

  return (
    <>
      <ul aria-label="Days" className="grid grid-cols-5 gap-1.5">
        {weekdays.map((day) => {
          const href =
            day.kind === "withoutTime" && dayWithoutTimeHref?.(day.date);
          const isToday = day.when === "today";
          const content = (
            <>
              <span
                className={cn(
                  "text-2xs",
                  isToday
                    ? "font-semibold text-brand"
                    : "text-muted-foreground",
                )}
              >
                {dayLabel(day.date)}
                {isToday && " · Today"}
              </span>
              <span
                className={cn(
                  "flex min-h-4 items-center gap-1.5 text-xs font-medium tabular-nums",
                  href
                    ? "text-brand underline underline-offset-2"
                    : day.kind !== "logged" && "text-muted-foreground",
                )}
              >
                {day.kind === "withoutTime" && <WarningDot />}
                {dayValue(day)}
              </span>
            </>
          );
          const dayStyle = cn(
            "flex h-full flex-col gap-0.5 rounded-lg border px-2 py-1.5",
            KIND_STYLES[day.kind],
            WHEN_STYLES[day.when],
            isToday && day.kind !== "off" && "bg-brand-muted",
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
                    "transition-colors hover:border-brand hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  )}
                >
                  {content}
                </Link>
              ) : day.kind === "closed" ? (
                // Says why on hover, as a closed day on Team time does.
                <Tooltip>
                  <TooltipTrigger
                    render={<div tabIndex={0} />}
                    className={cn(
                      dayStyle,
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    )}
                  >
                    {content}
                  </TooltipTrigger>
                  <TooltipContent>{closedText(day.date)}</TooltipContent>
                </Tooltip>
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
        {legend.map(({ label, swatch }) => (
          <li key={label} className="inline-flex items-center gap-1.5">
            {swatch}
            {label}
          </li>
        ))}
      </ul>
    </>
  );
};
