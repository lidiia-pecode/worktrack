import { Absence, PlanningRow as Row } from "@/types";
import { ProjectStatus, UserStatus } from "@/types/enums";
import {
  formatDuration,
  formatLongDayLabel,
  toISODate,
} from "@/lib/utils/date";
import {
  ABSENCE_TYPE_SHORT_LABELS,
  formatAbsenceRange,
  isPartDayAbsence,
} from "@/lib/utils/absence";
import { CLOSED_DAY_TEXT, closedSpellOn, fullName } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";
import { TooltipTrigger, type TooltipHandle } from "@/components/ui/tooltip";

import { EntryChip } from "../../shared/week/EntryChip";
import { ABSENCE_PATTERN } from "../../timesheet/consts";
import { describePlanDay, planBars } from "../plan-bars";
import { PlanningPersonCell } from "./PlanningPersonCell";
import { PlanningTotalCell } from "./PlanningTotalCell";

type PlanningWeekRowProps = {
  row: Row;
  weekDates: Date[];
  absencesByDate: Record<string, Absence>;
  isLocked: (date: string) => boolean;
  /** Set under a project filter: the row holds that project's plans only. */
  projectName?: string;
  /** The grid's one tooltip, which the days and bars fill on hover. */
  tooltip: TooltipHandle<string>;
  onPlanPeriod: (row: Row) => void;
  /** Opens the absence: to change it, or to read it when it can't change. */
  onAbsenceClick: (absence: Absence) => void;
};

/** Days next to each other that share a value, such as one absence. */
const runsOf = <T,>(values: (T | undefined)[]) => {
  const runs: { value: T; start: number; length: number }[] = [];
  values.forEach((value, index) => {
    const last = runs[runs.length - 1];
    if (value === undefined) return;
    if (last && last.value === value && last.start + last.length === index) {
      last.length += 1;
    } else {
      runs.push({ value, start: index, length: 1 });
    }
  });
  return runs;
};

/**
 * A person's week in Planning: each project's plan is one bar across the days
 * it repeats with the same hours. The days only show; planning starts from
 * the person, as on the month.
 */
export const PlanningWeekRow = ({
  row,
  weekDates,
  absencesByDate,
  isLocked,
  projectName,
  tooltip,
  onPlanPeriod,
  onAbsenceClick,
}: PlanningWeekRowProps) => {
  const isActive = row.user.status === UserStatus.ACTIVE;
  const dates = weekDates.map(toISODate);
  // A week wholly in locked months takes no plans, as a locked day doesn't.
  const isWeekLocked = dates.every(isLocked);
  const bars = planBars(row.entries, dates);
  const columns = {
    gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`,
  };
  // A closed day keeps the plans left over there, read-only; the server
  // leaves none on a day in another team.
  const closedOn = dates.map((date) =>
    row.entries.some((entry) => entry.date === date)
      ? undefined
      : closedSpellOn(row.closedSpells, date)?.reason,
  );

  return (
    <tr className="border-b border-border last:border-b-0">
      <PlanningPersonCell
        row={row}
        isPeriodLocked={isWeekLocked}
        onPlanPeriod={onPlanPeriod}
      />

      <td colSpan={dates.length} className="relative p-0 align-top">
        {/* The days' grounds, under the plans. */}
        <div className="absolute inset-0 grid" style={columns}>
          {dates.map((date, index) => {
            const closed = closedOn[index];
            const absence = absencesByDate[date];
            const className = cn(
              "border-r border-border/60",
              absence
                ? ABSENCE_PATTERN
                : closed || !isActive || isLocked(date)
                  ? "bg-day-locked"
                  : "bg-card",
            );
            // Part of a day away keeps its plans over it, so the striped day
            // itself opens the absence and names what is left to plan.
            if (absence && isPartDayAbsence(absence)) {
              return (
                <TooltipTrigger
                  key={date}
                  handle={tooltip}
                  payload={partDayText(absence, row, date)}
                  render={
                    <button
                      type="button"
                      onClick={() => onAbsenceClick(absence)}
                      aria-label={`${ABSENCE_TYPE_SHORT_LABELS[absence.type]} for ${fullName(row.user)}, ${formatAbsenceRange(absence)}, open the absence`}
                    />
                  }
                  className={cn(
                    className,
                    "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  )}
                />
              );
            }
            return closed ? (
              <TooltipTrigger
                key={date}
                handle={tooltip}
                payload={CLOSED_DAY_TEXT[closed]}
                render={<span aria-hidden />}
                className={className}
              />
            ) : (
              <span key={date} aria-hidden className={className} />
            );
          })}
        </div>

        {/* Drawn for the eye; a screen reader hears the days below. */}
        <div
          aria-hidden
          // The days' grounds beneath take the hover; only the bars answer it here.
          className="pointer-events-none relative grid min-h-10 auto-rows-6 gap-y-0.75 py-1.5"
          style={columns}
        >
          {bars.map((bar) => {
            const isArchived = bar.project.status === ProjectStatus.ARCHIVED;
            const name = isArchived
              ? `${bar.project.name} (archived)`
              : bar.project.name;

            return (
              <TooltipTrigger
                key={`${bar.project.id}-${bar.start}`}
                handle={tooltip}
                payload={`${name} · ${formatDuration(bar.minutes)} a day`}
                render={<span />}
                className="pointer-events-auto mx-1.5 min-w-0"
                style={{
                  gridRow: bar.lane + 1,
                  gridColumn: `${bar.start + 1} / span ${bar.length}`,
                }}
              >
                <EntryChip
                  projectName={bar.project.name}
                  colorSeed={bar.project.id}
                  minutes={bar.minutes}
                  isPlan
                  isArchived={isArchived}
                />
              </TooltipTrigger>
            );
          })}
        </div>

        {/* An absence opens its form, so it is a real button over its days,
            on the plans' own grid. */}
        <div
          className="pointer-events-none absolute inset-0 grid auto-rows-6 gap-y-0.75 py-1.5"
          style={columns}
        >
          {runsOf(
            dates.map((date) => {
              const absence = absencesByDate[date];
              // Part of a day opens from its striped day instead.
              return absence && !isPartDayAbsence(absence)
                ? absence
                : undefined;
            }),
          ).map((run) => (
            <button
              key={`absence-${run.start}`}
              type="button"
              onClick={() => onAbsenceClick(run.value)}
              aria-label={`${ABSENCE_TYPE_SHORT_LABELS[run.value.type]} for ${fullName(row.user)}, ${formatAbsenceRange(run.value)}, open the absence`}
              className="pointer-events-auto mx-1.5 w-fit self-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              style={{
                gridRow: 1,
                gridColumn: `${run.start + 1} / span ${run.length}`,
              }}
            >
              <Badge
                variant="default"
                className="cursor-pointer text-2xs transition-colors hover:bg-brand-muted"
              >
                {ABSENCE_TYPE_SHORT_LABELS[run.value.type]}
              </Badge>
            </button>
          ))}
        </div>

        <span className="sr-only">
          {weekDates
            .map(
              (date, index) =>
                `${formatLongDayLabel(date)}: ${describePlanDay({
                  entries: row.entries.filter(
                    (entry) => entry.date === dates[index],
                  ),
                  absence: absencesByDate[dates[index]],
                  closed: closedOn[index],
                })}.`,
            )
            .join(" ")}
        </span>
      </td>

      <PlanningTotalCell
        row={row}
        period="week"
        projectName={projectName}
        tooltip={tooltip}
      />
    </tr>
  );
};

/** "Vacation · 2h · 6h left to plan", or how far the day's plans are over. */
const partDayText = (
  absence: Absence & { minutes: number },
  row: Row,
  date: string,
) => {
  const limit = row.dayLimits.find((day) => day.date === date)?.minutes ?? 0;
  const planned = row.entries
    .filter((entry) => entry.date === date)
    .reduce((sum, entry) => sum + entry.plannedMinutes, 0);
  const room =
    planned > limit
      ? `${formatDuration(planned - limit)} over`
      : `${formatDuration(limit - planned)} left to plan`;

  return `${ABSENCE_TYPE_SHORT_LABELS[absence.type]} · ${formatDuration(absence.minutes)} · ${room}`;
};
