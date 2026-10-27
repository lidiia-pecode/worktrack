import { ChevronRight, Plus } from "lucide-react";

import { Absence, PlanningEntry, PlanningWeekRow as Row } from "@/types";
import { ProjectStatus, UserStatus } from "@/types/enums";
import {
  formatDuration,
  formatLongDayLabel,
  isWeekend,
  toISODate,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { fullName } from "@/lib/utils/user";
import { getProjectColor } from "@/lib/utils/project-colors";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";

import { PersonLabel } from "../../shared/PersonLabel";
import { ABSENCE_PATTERN, WEEKEND_PATTERN } from "../../timesheet/consts";
import { STICKY_PERSON_CELL } from "../../shared/week/sticky-column";

type PlanningWeekRowProps = {
  row: Row;
  weekDates: Date[];
  absencesByDate: Record<string, Absence>;
  isLocked: (date: string) => boolean;
  isEditable: (date: string) => boolean;
  onOpenDay: (row: Row, date: string) => void;
  onPlanPeriod: (row: Row) => void;
};

const EntryLine = ({ entry }: { entry: PlanningEntry }) => {
  const isArchived = entry.project.status === ProjectStatus.ARCHIVED;

  // In the project's colour, like the timesheet's entries, so the board reads
  // as a plan; an archived project stays grey.
  return (
    <span
      title={
        isArchived ? `${entry.project.name} (archived)` : entry.project.name
      }
      style={
        isArchived
          ? undefined
          : { backgroundColor: getProjectColor(entry.project.id) }
      }
      className={cn(
        "flex items-baseline justify-between gap-1.5 rounded-md px-1.5 py-0.5 text-xs",
        isArchived
          ? "bg-muted/30 text-muted-foreground line-through"
          : "text-foreground",
      )}
    >
      <span className="truncate">{entry.project.name}</span>
      <span className="shrink-0 font-medium tabular-nums">
        {formatDuration(entry.plannedMinutes)}
      </span>
    </span>
  );
};

const DayEntries = ({
  absence,
  entries,
}: {
  absence?: Absence;
  entries: PlanningEntry[];
}) => (
  <>
    {absence && (
      <Badge variant="default" className="w-fit text-2xs">
        {ABSENCE_TYPE_SHORT_LABELS[absence.type]}
      </Badge>
    )}

    {entries.map((entry) => (
      <EntryLine key={entry.id} entry={entry} />
    ))}
  </>
);

export const PlanningWeekRow = ({
  row,
  weekDates,
  absencesByDate,
  isLocked,
  isEditable,
  onOpenDay,
  onPlanPeriod,
}: PlanningWeekRowProps) => {
  const entriesByDate = new Map<string, PlanningEntry[]>();
  row.entries.forEach((entry) => {
    entriesByDate.set(entry.date, [
      ...(entriesByDate.get(entry.date) ?? []),
      entry,
    ]);
  });

  const isActive = row.user.status === UserStatus.ACTIVE;
  const overMinutes = Math.max(0, row.plannedMinutes - row.availableMinutes);

  return (
    <tr className="border-b border-border last:border-b-0">
      <th
        scope="row"
        className={cn(STICKY_PERSON_CELL, "p-0 text-left font-normal")}
      >
        {isActive ? (
          <button
            type="button"
            onClick={() => onPlanPeriod(row)}
            aria-label={`Plan a period for ${fullName(row.user)}`}
            className="group flex w-full min-w-0 cursor-pointer items-center gap-2.5 p-3 text-left transition hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <PersonLabel user={row.user} />

            {/* Says what the cell does once it is hovered or focused; it
                takes no room until then, so the name keeps its width. */}
            <span
              aria-hidden
              className="ml-auto hidden shrink-0 items-center gap-0.5 text-xs font-medium text-brand group-hover:flex group-focus-visible:flex"
            >
              Plan period
              <ChevronRight className="size-3.5" />
            </span>
          </button>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5 p-3">
            <PersonLabel user={row.user} />

            <Badge variant="neutral" size="sm" className="ml-auto shrink-0">
              Deactivated
            </Badge>
          </div>
        )}
      </th>

      {weekDates.map((date) => {
        const iso = toISODate(date);
        const entries = entriesByDate.get(iso) ?? [];
        const absence = absencesByDate[iso];

        const weekend = isWeekend(date);

        if (weekend && !absence) {
          return (
            <td
              key={iso}
              className={cn(
                "border-r border-border/60 p-3 text-center text-sm text-muted-foreground",
                WEEKEND_PATTERN,
              )}
            >
              -
            </td>
          );
        }

        // A deactivated person's plans stay visible, but nothing can be
        // written for them, like a locked day. An absence on a weekend is
        // shown, as on the other week views, but plans never go there.
        if (weekend || !isActive || !isEditable(iso)) {
          return (
            <td
              key={iso}
              className={cn(
                "border-r border-border/60 p-2 align-top",
                absence
                  ? ABSENCE_PATTERN
                  : (!isActive || isLocked(iso)) && "bg-muted/20",
              )}
            >
              <div className="flex min-h-10 flex-col gap-1">
                <DayEntries absence={absence} entries={entries} />
              </div>
            </td>
          );
        }

        return (
          <td
            key={iso}
            className={cn(
              "h-px border-r border-border/60 p-0 align-top",
              absence && ABSENCE_PATTERN,
            )}
          >
            {/* The button's name is the day and its contents, read in order. */}
            <button
              type="button"
              onClick={() => onOpenDay(row, iso)}
              className="group flex h-full min-h-14 w-full flex-col gap-1 p-2 text-left hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="sr-only">{formatLongDayLabel(date)}: </span>

              <DayEntries absence={absence} entries={entries} />

              {entries.length === 0 && !absence && (
                <>
                  <span className="sr-only">nothing planned</span>
                  <Plus
                    aria-hidden
                    className="m-auto size-4 text-muted-foreground/60 transition-colors group-hover:text-foreground group-focus-visible:text-foreground"
                  />
                </>
              )}
            </button>
          </td>
        );
      })}

      <td className="p-3 text-right text-sm whitespace-nowrap tabular-nums">
        <div>
          <span className="font-semibold text-foreground">
            {formatDuration(row.plannedMinutes)}
          </span>

          <span className="ml-1.5 text-xs text-muted-foreground">
            / {formatDuration(row.availableMinutes)}
          </span>
        </div>

        {overMinutes > 0 && (
          <Badge
            variant="warning"
            title={`Planned ${formatDuration(overMinutes)} more than ${row.user.firstName} has available this week`}
            className="mt-1 px-1.5 text-2xs font-medium"
          >
            Over by {formatDuration(overMinutes)}
          </Badge>
        )}
      </td>
    </tr>
  );
};
