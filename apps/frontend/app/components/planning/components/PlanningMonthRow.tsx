import { Absence, PlanningEntry, PlanningRow } from "@/types";
import {
  formatDuration,
  formatLongDayLabel,
  formatReportHours,
  toISODate,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { closedSpellOn, fullName } from "@/lib/utils/user";
import { getProjectColor, planMark } from "@/lib/utils/project-colors";
import { cn } from "@/lib/utils/cn";

import { ABSENCE_PATTERN } from "../../timesheet/consts";
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
  limit: number;
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
 * A person's month in Planning: one cell per week, a strip per working day
 * filled to its planned share of the person's day in the projects' colours.
 * A cell opens its week, where the days are planned one by one.
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
  const limitOn = new Map(row.dayLimits.map((day) => [day.date, day.minutes]));

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
            limit: limitOn.get(iso) ?? 0,
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

              <span aria-hidden className="flex h-6 gap-0.75">
                {days.map((day) => {
                  const base = Math.max(day.limit, day.planned);

                  return (
                    <span
                      key={toISODate(day.date)}
                      title={`${formatLongDayLabel(day.date)}: ${describeDay(day)}`}
                      className={cn(
                        "flex min-w-0 flex-1 flex-col-reverse overflow-hidden rounded-xs",
                        day.isClosed
                          ? "bg-day-locked outline-1 -outline-offset-1 outline-border outline-dashed"
                          : day.absence
                            ? ABSENCE_PATTERN
                            : "bg-muted/30",
                        day.limit > 0 &&
                          day.planned > day.limit &&
                          "border-t-2 border-warning",
                      )}
                    >
                      {day.entries.map((entry) => (
                        <span
                          key={entry.id}
                          className="block shrink-0"
                          style={{
                            height: `${(entry.plannedMinutes / base) * 100}%`,
                            backgroundColor: planMark(
                              getProjectColor(entry.project.id),
                            ),
                          }}
                        />
                      ))}
                    </span>
                  );
                })}
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
