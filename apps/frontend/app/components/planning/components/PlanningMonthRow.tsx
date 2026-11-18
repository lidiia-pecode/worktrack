import { Absence, ClosedSpell, PlanningEntry, PlanningRow } from "@/types";
import { ProjectStatus } from "@/types/enums";
import {
  formatDuration,
  formatLongDayLabel,
  formatReportHours,
  toISODate,
} from "@/lib/utils/date";
import { closedSpellOn, fullName } from "@/lib/utils/user";
import { getProjectColor, planSurface } from "@/lib/utils/project-colors";
import { cn } from "@/lib/utils/cn";

import { ABSENCE_PATTERN } from "../../timesheet/consts";
import { weekLabel } from "../month-weeks";
import { describePlanDay, planBars } from "../plan-bars";
import { hasNoFixedHours, PlanningPersonCell } from "./PlanningPersonCell";
import { PlanningTotalCell } from "./PlanningTotalCell";

type PlanningMonthRowProps = {
  row: PlanningRow;
  /** The month's working days, one list per week. */
  weeks: Date[][];
  absencesByDate: Record<string, Absence>;
  isMonthLocked: boolean;
  /** Set under a project filter: the row holds that project's plans only. */
  projectName?: string;
  onOpenWeek: (firstDay: Date) => void;
  onPlanPeriod: (row: PlanningRow) => void;
};

type MonthDay = {
  date: Date;
  entries: PlanningEntry[];
  planned: number;
  available: number;
  absence?: Absence;
  /** Outside the view with nothing left on it, drawn as closed. */
  closed?: ClosedSpell["reason"];
};

/**
 * A person's month in Planning: per week, a bar per project across its days,
 * named when it covers two days or more. A week's cell opens it.
 */
export const PlanningMonthRow = ({
  row,
  weeks,
  absencesByDate,
  isMonthLocked,
  projectName,
  onOpenWeek,
  onPlanPeriod,
}: PlanningMonthRowProps) => {
  const entriesByDate = new Map<string, PlanningEntry[]>();
  row.entries.forEach((entry) => {
    entriesByDate.set(entry.date, [
      ...(entriesByDate.get(entry.date) ?? []),
      entry,
    ]);
  });
  const availableOn = new Map(
    row.availableByDay.map((day) => [day.date, day.minutes]),
  );
  // Plans left on someone with no hours to plan are shown, never weighed
  // against what they have.
  const showsPlannedOnly = Boolean(projectName) || hasNoFixedHours(row);

  return (
    <tr className="border-b border-border last:border-b-0">
      <PlanningPersonCell
        row={row}
        isPeriodLocked={isMonthLocked}
        onPlanPeriod={onPlanPeriod}
      />

      {weeks.map((week) => {
        const days = week.map((date): MonthDay => {
          const iso = toISODate(date);
          const entries = entriesByDate.get(iso) ?? [];
          return {
            date,
            entries,
            planned: entries.reduce(
              (sum, entry) => sum + entry.plannedMinutes,
              0,
            ),
            available: availableOn.get(iso) ?? 0,
            absence: absencesByDate[iso],
            // A closed day keeps the plans left over there, as in the week.
            closed:
              entries.length === 0
                ? closedSpellOn(row.closedSpells, iso)?.reason
                : undefined,
          };
        });
        const planned = days.reduce((sum, day) => sum + day.planned, 0);
        const available = days.reduce((sum, day) => sum + day.available, 0);
        // Quiet when the week is planned exactly; under a project there is no
        // available figure, so only the project's hours show.
        const hours = showsPlannedOnly
          ? planned > 0 && formatReportHours(planned)
          : planned !== available &&
            `${formatReportHours(planned)} / ${formatReportHours(available)}`;
        const isOver = !showsPlannedOnly && planned > available;
        const bars = planBars(
          days.flatMap((day) => day.entries),
          week.map(toISODate),
        );
        const laneCount = Math.max(1, ...bars.map((bar) => bar.lane + 1));
        const columns = {
          gridTemplateColumns: `repeat(${week.length}, minmax(0, 1fr))`,
        };

        return (
          <td
            key={toISODate(week[0])}
            className="h-px border-r border-border/60 p-0 align-top"
          >
            <button
              type="button"
              onClick={() => onOpenWeek(week[0])}
              className="flex h-full w-full flex-col gap-1 p-1.5 text-left hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="sr-only">
                {`Open the week of ${weekLabel(week)} for ${fullName(row.user)}. `}
              </span>

              {/* The days' grounds, under one lane of bars per project. */}
              <span aria-hidden className="relative flex flex-col gap-0.75">
                <span className="absolute inset-0 grid gap-0.5" style={columns}>
                  {days.map((day) => (
                    <span
                      key={toISODate(day.date)}
                      title={`${formatLongDayLabel(day.date)}: ${describePlanDay(day)}`}
                      className={cn(
                        "not-first:border-l not-first:border-dotted not-first:border-border",
                        day.closed
                          ? "bg-day-locked"
                          : day.absence && ABSENCE_PATTERN,
                      )}
                    />
                  ))}
                </span>

                {Array.from({ length: laneCount }, (_, lane) => (
                  <span
                    key={lane}
                    className="pointer-events-none relative grid h-6 gap-0.5"
                    style={columns}
                  >
                    {bars
                      .filter((bar) => bar.lane === lane)
                      .map((bar) => {
                        // Grey and struck through, as in the week.
                        const isArchived =
                          bar.project.status === ProjectStatus.ARCHIVED;
                        const name = isArchived
                          ? `${bar.project.name} (archived)`
                          : bar.project.name;
                        const surface = isArchived
                          ? undefined
                          : planSurface(getProjectColor(bar.project.id));

                        return (
                          <span
                            key={`${bar.project.id}-${bar.start}`}
                            title={`${name} · ${formatDuration(bar.minutes)} a day`}
                            className={cn(
                              "pointer-events-auto truncate rounded-md px-2 text-xs leading-6 text-muted-foreground",
                              isArchived && "bg-muted/30 line-through",
                            )}
                            style={{
                              ...surface,
                              gridColumn: `${bar.start + 1} / span ${bar.length}`,
                            }}
                          >
                            {bar.length > 1 && bar.project.name}
                          </span>
                        );
                      })}
                  </span>
                ))}
              </span>

              <span className="sr-only">
                {days
                  .map(
                    (day) =>
                      `${formatLongDayLabel(day.date)}: ${describePlanDay(day)}.`,
                  )
                  .join(" ")}
              </span>

              {hours && (
                <span
                  className={cn(
                    "text-2xs whitespace-nowrap",
                    isOver ? "text-warning-text" : "text-muted-foreground",
                  )}
                >
                  {hours}
                </span>
              )}
            </button>
          </td>
        );
      })}

      <PlanningTotalCell row={row} period="month" projectName={projectName} />
    </tr>
  );
};
