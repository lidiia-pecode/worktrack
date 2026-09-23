import { Plus } from "lucide-react";

import { Absence, PlanningEntry, PlanningWeekRow as Row } from "@/types";
import { ProjectStatus } from "@/types/enums";
import {
  formatDuration,
  formatLongDayLabel,
  isWeekend,
  toISODate,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { fullName } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";

import { PersonLabel } from "../../shared/PersonLabel";

type PlanningWeekRowProps = {
  row: Row;
  weekDates: Date[];
  absencesByDate: Record<string, Absence>;
  isLocked: (date: string) => boolean;
  onOpenDay: (row: Row, date: string) => void;
};

const EntryLine = ({ entry }: { entry: PlanningEntry }) => {
  const isArchived = entry.project.status === ProjectStatus.ARCHIVED;

  return (
    <span
      title={
        isArchived ? `${entry.project.name} (archived)` : entry.project.name
      }
      className={cn(
        "flex items-baseline justify-between gap-1.5 text-xs",
        isArchived ? "text-muted-foreground line-through" : "text-foreground",
      )}
    >
      <span className="truncate">{entry.project.name}</span>
      <span className="shrink-0 font-medium tabular-nums">
        {formatDuration(entry.plannedMinutes)}
      </span>
    </span>
  );
};

export const PlanningWeekRow = ({
  row,
  weekDates,
  absencesByDate,
  isLocked,
  onOpenDay,
}: PlanningWeekRowProps) => {
  const entriesByDate = new Map<string, PlanningEntry[]>();
  row.entries.forEach((entry) => {
    entriesByDate.set(entry.date, [
      ...(entriesByDate.get(entry.date) ?? []),
      entry,
    ]);
  });

  const overMinutes = Math.max(0, row.plannedMinutes - row.availableMinutes);
  const unplannedMinutes = Math.max(
    0,
    row.availableMinutes - row.plannedMinutes,
  );

  return (
    <tr className="border-b border-border last:border-b-0">
      <th
        scope="row"
        className="border-r border-border/60 p-0 text-left font-normal"
      >
        <div className="flex min-w-0 items-center gap-2.5 p-3">
          <PersonLabel user={row.user} />
        </div>
      </th>

      {weekDates.map((date) => {
        const iso = toISODate(date);
        const entries = entriesByDate.get(iso) ?? [];
        const absence = absencesByDate[iso];

        if (isWeekend(date)) {
          return (
            <td
              key={iso}
              className="border-r border-border/60 bg-muted/20 p-3 text-center text-sm text-muted-foreground/60"
            >
              -
            </td>
          );
        }

        if (isLocked(iso)) {
          return (
            <td
              key={iso}
              className={cn(
                "border-r border-border/60 p-2 align-top",
                absence ? "bg-brand-subtle" : "bg-muted/20",
              )}
            >
              <div className="flex min-h-10 flex-col gap-1">
                {absence && (
                  <Badge variant="default" className="w-fit text-[10px]">
                    {ABSENCE_TYPE_SHORT_LABELS[absence.type]}
                  </Badge>
                )}

                {entries.map((entry) => (
                  <EntryLine key={entry.id} entry={entry} />
                ))}
              </div>
            </td>
          );
        }

        return (
          <td
            key={iso}
            className={cn(
              "h-px border-r border-border/60 p-0 align-top",
              absence && "bg-brand-subtle",
            )}
          >
            <button
              type="button"
              onClick={() => onOpenDay(row, iso)}
              aria-label={`Plan ${fullName(row.user)} on ${formatLongDayLabel(date)}`}
              className="group flex h-full min-h-14 w-full flex-col gap-1 p-2 text-left hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
            >
              {absence && (
                <Badge variant="default" className="w-fit text-[10px]">
                  {ABSENCE_TYPE_SHORT_LABELS[absence.type]}
                </Badge>
              )}

              {entries.map((entry) => (
                <EntryLine key={entry.id} entry={entry} />
              ))}

              {entries.length === 0 && (
                <Plus
                  aria-hidden
                  className="m-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                />
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

        {overMinutes > 0 ? (
          <Badge
            variant="warning"
            title={`Planned ${formatDuration(overMinutes)} more than ${row.user.firstName} has available this week`}
            className="mt-1 px-1.5 py-0.2 text-[10px] font-medium"
          >
            Over by {formatDuration(overMinutes)}
          </Badge>
        ) : (
          unplannedMinutes > 0 && (
            <span className="mt-1 block text-xs text-muted-foreground">
              {formatDuration(unplannedMinutes)} free
            </span>
          )
        )}
      </td>
    </tr>
  );
};
