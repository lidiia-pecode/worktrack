import { Absence, PlanningRow as Row } from "@/types";
import { ProjectStatus, UserStatus } from "@/types/enums";
import { formatDuration, toISODate } from "@/lib/utils/date";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { CLOSED_DAY_TEXT, closedSpellOn } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";

import { EntryChip } from "../../shared/week/EntryChip";
import { ABSENCE_PATTERN } from "../../timesheet/consts";
import { planBars } from "../plan-bars";
import { PlanningPersonCell } from "./PlanningPersonCell";
import { PlanningTotalCell } from "./PlanningTotalCell";

type PlanningWeekRowProps = {
  row: Row;
  weekDates: Date[];
  absencesByDate: Record<string, Absence>;
  isLocked: (date: string) => boolean;
  /** Set under a project filter: the row holds that project's plans only. */
  projectName?: string;
  onPlanPeriod: (row: Row) => void;
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
  onPlanPeriod,
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
        <div aria-hidden className="absolute inset-0 grid" style={columns}>
          {dates.map((date, index) => {
            const closed = closedOn[index];
            return (
              <span
                key={date}
                title={closed ? CLOSED_DAY_TEXT[closed] : undefined}
                className={cn(
                  "border-r border-border/60",
                  absencesByDate[date]
                    ? ABSENCE_PATTERN
                    : closed || !isActive || isLocked(date)
                      ? "bg-day-locked"
                      : "bg-card",
                )}
              />
            );
          })}
        </div>

        <div
          className="relative grid min-h-10 auto-rows-6 gap-y-0.75 py-1.5"
          style={columns}
        >
          {runsOf(dates.map((date) => absencesByDate[date])).map((run) => (
            <Badge
              key={`absence-${run.start}`}
              variant="default"
              className="mx-1.5 w-fit self-center text-2xs"
              style={{
                gridRow: 1,
                gridColumn: `${run.start + 1} / span ${run.length}`,
              }}
            >
              {ABSENCE_TYPE_SHORT_LABELS[run.value.type]}
            </Badge>
          ))}

          {runsOf(closedOn).map((run) => (
            <span
              key={`closed-${run.start}`}
              className="sr-only"
              style={{ gridRow: 1, gridColumn: run.start + 1 }}
            >
              {CLOSED_DAY_TEXT[run.value]}
            </span>
          ))}

          {bars.map((bar) => {
            const isArchived = bar.project.status === ProjectStatus.ARCHIVED;
            const name = isArchived
              ? `${bar.project.name} (archived)`
              : bar.project.name;

            return (
              <span
                key={`${bar.project.id}-${bar.start}`}
                className="mx-1.5 min-w-0"
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
                  title={`${name} · ${formatDuration(bar.minutes)} a day`}
                />
              </span>
            );
          })}
        </div>
      </td>

      <PlanningTotalCell row={row} period="week" projectName={projectName} />
    </tr>
  );
};
