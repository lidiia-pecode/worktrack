import { Plus } from "lucide-react";

import { Absence, PlanningEntry, PlanningRow as Row } from "@/types";
import { ProjectStatus, UserStatus } from "@/types/enums";
import { formatLongDayLabel, toISODate } from "@/lib/utils/date";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { closedSpellOn } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";

import { EntryChip } from "../../shared/week/EntryChip";
import { ABSENCE_PATTERN } from "../../timesheet/consts";
import { ClosedDayCell } from "../../shared/week/ClosedDayCell";
import { PlanningPersonCell, hasNoFixedHours } from "./PlanningPersonCell";
import { PlanningTotalCell } from "./PlanningTotalCell";

type PlanningWeekRowProps = {
  row: Row;
  weekDates: Date[];
  absencesByDate: Record<string, Absence>;
  isLocked: (date: string) => boolean;
  isEditable: (date: string) => boolean;
  /** Set under a project filter: the row holds that project's plans only. */
  projectName?: string;
  onOpenDay: (row: Row, date: string) => void;
  onPlanPeriod: (row: Row) => void;
};

const EntryLine = ({ entry }: { entry: PlanningEntry }) => {
  const isArchived = entry.project.status === ProjectStatus.ARCHIVED;

  return (
    <EntryChip
      projectName={entry.project.name}
      colorSeed={entry.project.id}
      minutes={entry.plannedMinutes}
      isPlan
      isArchived={isArchived}
      title={
        isArchived ? `${entry.project.name} (archived)` : entry.project.name
      }
    />
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
  projectName,
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
  const noFixedHours = hasNoFixedHours(row);
  // A week wholly in locked months takes no plans, as a locked day doesn't.
  const isWeekLocked = weekDates.every((date) => isLocked(toISODate(date)));

  return (
    <tr className="border-b border-border last:border-b-0">
      <PlanningPersonCell
        row={row}
        isPeriodLocked={isWeekLocked}
        onPlanPeriod={onPlanPeriod}
      />

      {weekDates.map((date) => {
        const iso = toISODate(date);
        // A closed day keeps the plans left over there, read-only, as in an
        // earlier spell of someone since back; the server leaves none on a
        // day in another team.
        const closed = closedSpellOn(row.closedSpells, iso);
        const keepsLeftoverPlans = (entriesByDate.get(iso)?.length ?? 0) > 0;
        if (closed && !keepsLeftoverPlans) {
          return <ClosedDayCell key={iso} reason={closed.reason} />;
        }

        const entries = entriesByDate.get(iso) ?? [];
        const absence = absencesByDate[iso];

        // A deactivated person's plans stay visible, but nothing can be
        // written for them, like a locked day; at 0h only a day with plans
        // opens, to delete them.
        if (
          !isActive ||
          !isEditable(iso) ||
          closed ||
          (noFixedHours && entries.length === 0)
        ) {
          return (
            <td
              key={iso}
              className={cn(
                "border-r border-border/60 p-1.5 align-top",
                absence
                  ? ABSENCE_PATTERN
                  : !isActive || isLocked(iso)
                    ? "bg-day-locked"
                    : "bg-card",
              )}
            >
              <div className="flex min-h-10 flex-col gap-0.75">
                <DayEntries absence={absence} entries={entries} />
              </div>
            </td>
          );
        }

        return (
          <td
            key={iso}
            className={cn(
              "h-px border-r border-border/60 bg-card p-0 align-top",
              absence && ABSENCE_PATTERN,
            )}
          >
            {/* The button's name is the day and its contents, read in order. */}
            <button
              type="button"
              onClick={() => onOpenDay(row, iso)}
              className="group flex h-full min-h-14 w-full flex-col gap-0.75 p-1.5 text-left hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="sr-only">{formatLongDayLabel(date)}: </span>

              <DayEntries absence={absence} entries={entries} />

              {entries.length === 0 && !absence && (
                <>
                  <span className="sr-only">nothing planned</span>
                  <Plus
                    aria-hidden
                    className="m-auto size-3.5 text-muted-foreground/45 transition-colors group-hover:text-brand group-focus-visible:text-brand"
                  />
                </>
              )}
            </button>
          </td>
        );
      })}

      <PlanningTotalCell row={row} period="week" projectName={projectName} />
    </tr>
  );
};
