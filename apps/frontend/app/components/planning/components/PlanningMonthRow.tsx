import { Absence, PlanningEntry, PlanningRow } from "@/types";
import {
  formatDuration,
  formatLongDayLabel,
  formatReportHours,
  toISODate,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { closedSpellOn, fullName } from "@/lib/utils/user";
import { getProjectColor, planSurface } from "@/lib/utils/project-colors";
import { cn } from "@/lib/utils/cn";

import { ABSENCE_PATTERN } from "../../timesheet/consts";
import { planBars } from "../plan-bars";
import { PlanningPersonCell } from "./PlanningPersonCell";
import { PlanningTotalCell } from "./PlanningTotalCell";

type PlanningMonthRowProps = {
  row: PlanningRow;
  /** The month's working days, one list per week. */
  weeks: Date[][];
  /** The name each week has in the heading, for a screen reader. */
  weekLabels: string[];
  absencesByDate: Record<string, Absence>;
  isMonthLocked: boolean;
  /** Set under a project filter: the row holds that project's plans only. */
  projectName?: string;
  onOpenWeek: (firstDay: Date) => void;
  onPlanPeriod: (row: PlanningRow) => void;
};

const sumMinutes = (items: { minutes: number }[]) =>
  items.reduce((sum, item) => sum + item.minutes, 0);

type MonthDay = {
  date: Date;
  entries: PlanningEntry[];
  planned: number;
  available: number;
  absence?: Absence;
  /** Outside the view with nothing left on it, drawn as closed. */
  isClosed: boolean;
};

/** What a day holds, for its tooltip and a screen reader. */
const describeDay = ({ entries, absence, isClosed }: MonthDay) => {
  if (isClosed) return "not in this view";

  const plans = entries.map(
    (entry) => `${entry.project.name} ${formatDuration(entry.plannedMinutes)}`,
  );
  const parts = [absence && ABSENCE_TYPE_SHORT_LABELS[absence.type], ...plans];
  return parts.filter(Boolean).join(", ") || "nothing planned";
};

/**
 * A person's month in Planning: one cell per week, where each project's plan
 * is a bar across its days, as in the week, named when it covers two days or
 * more. A cell opens its week.
 */
export const PlanningMonthRow = ({
  row,
  weeks,
  weekLabels,
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

  return (
    <tr className="border-b border-border last:border-b-0">
      <PlanningPersonCell
        row={row}
        isPeriodLocked={isMonthLocked}
        onPlanPeriod={onPlanPeriod}
      />

      {weeks.map((week, index) => {
        const days = week.map((date): MonthDay => {
          const iso = toISODate(date);
          const entries = entriesByDate.get(iso) ?? [];
          return {
            date,
            entries,
            planned: entries.reduce((sum, e) => sum + e.plannedMinutes, 0),
            available: availableOn.get(iso) ?? 0,
            absence: absencesByDate[iso],
            // A closed day keeps the plans left over there, as in the week.
            isClosed:
              !!closedSpellOn(row.closedSpells, iso) && entries.length === 0,
          };
        });
        const planned = sumMinutes(
          days.map((day) => ({ minutes: day.planned })),
        );
        const available = sumMinutes(
          days.map((day) => ({ minutes: day.available })),
        );
        // Quiet when the week is planned exactly; under a project there is no
        // available figure, so only the project's hours show.
        const hours = projectName
          ? planned > 0 && formatReportHours(planned)
          : planned !== available &&
            `${formatReportHours(planned)} / ${formatReportHours(available)}`;
        const isOver = !projectName && planned > available;
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
                {`Open the week of ${weekLabels[index]} for ${fullName(row.user)}. `}
              </span>

              {/* One lane per project, over the days' grounds: a free day
                  stays empty, an absence striped, a closed day tinted. */}
              <span aria-hidden className="relative flex flex-col gap-0.75">
                <span className="absolute inset-0 grid gap-0.5" style={columns}>
                  {days.map((day) => (
                    <span
                      key={toISODate(day.date)}
                      title={`${formatLongDayLabel(day.date)}: ${describeDay(day)}`}
                      className={cn(
                        "not-first:border-l not-first:border-dotted not-first:border-border",
                        day.isClosed
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
                      .map((bar) => (
                        <span
                          key={`${bar.project.id}-${bar.start}`}
                          title={`${bar.project.name} · ${formatDuration(bar.minutes)} a day`}
                          className="pointer-events-auto truncate rounded-md px-2 text-xs leading-6 text-muted-foreground"
                          style={{
                            gridColumn: `${bar.start + 1} / span ${bar.length}`,
                            ...planSurface(getProjectColor(bar.project.id)),
                          }}
                        >
                          {bar.length > 1 && bar.project.name}
                        </span>
                      ))}
                  </span>
                ))}
              </span>

              <span className="sr-only">
                {days
                  .map(
                    (day) =>
                      `${formatLongDayLabel(day.date)}: ${describeDay(day)}.`,
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
