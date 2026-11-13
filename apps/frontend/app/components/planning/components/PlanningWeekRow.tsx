import { ChevronRight, Plus } from "lucide-react";

import { Absence, PlanningEntry, PlanningWeekRow as Row } from "@/types";
import { ProjectStatus, UserStatus } from "@/types/enums";
import {
  formatDuration,
  formatLongDayLabel,
  toISODate,
} from "@/lib/utils/date";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import {
  NO_FIXED_HOURS,
  closedSpellOn,
  fullName,
  leaverLabel,
  moveLabel,
} from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";
import { factsLine } from "@/lib/utils/text";

import { Badge } from "@/components/ui/badge";

import { PersonLabel } from "../../shared/PersonLabel";
import { EntryChip } from "../../shared/week/EntryChip";
import { ABSENCE_PATTERN } from "../../timesheet/consts";
import { STICKY_PERSON_CELL } from "../../shared/week/sticky-column";
import { ClosedDayCell } from "../../shared/week/ClosedDayCell";
import { RowTotalCell } from "../../shared/week/RowTotalCell";
import { ReportBar } from "../../reports/components/ReportBar";

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
  // Someone who left the team in view this week has no period to plan here;
  // their days before the move still open one by one.
  const hasMovedOut = row.moves.some((move) => move.direction === "out");
  // Listed at 0h only for plans left from before, which can be deleted day by
  // day, but never changed or added to.
  const hasNoFixedHours = row.dayLimits.every((day) => day.minutes === 0);
  // A week wholly in locked months takes no plans, as a locked day doesn't.
  const isWeekLocked = weekDates.every((date) => isLocked(toISODate(date)));
  const facts = factsLine([
    ...row.moves.map(moveLabel),
    leaverLabel(row.user),
    isActive && hasNoFixedHours && NO_FIXED_HOURS,
  ]);
  const overMinutes =
    projectName || hasNoFixedHours
      ? 0
      : Math.max(0, row.plannedMinutes - row.availableMinutes);

  return (
    <tr className="border-b border-border last:border-b-0">
      <th
        scope="row"
        className={cn(STICKY_PERSON_CELL, "p-0 text-left font-normal")}
      >
        {isActive && !hasMovedOut && !hasNoFixedHours && !isWeekLocked ? (
          <button
            type="button"
            onClick={() => onPlanPeriod(row)}
            aria-label={`Plan a period for ${fullName(row.user)}`}
            className="group flex w-full min-w-0 cursor-pointer items-start gap-2.5 py-2 pr-1.5 pl-2.5 text-left transition hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <PersonLabel user={row.user}>{facts}</PersonLabel>

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
          <div className="flex min-w-0 items-start gap-2.5 py-2 pr-1.5 pl-2.5">
            <PersonLabel user={row.user}>
              {facts && (
                <span
                  title={
                    isActive && hasNoFixedHours
                      ? `Give ${row.user.firstName} working hours to plan them.`
                      : undefined
                  }
                >
                  {facts}
                </span>
              )}
            </PersonLabel>
          </div>
        )}
      </th>

      {weekDates.map((date) => {
        const iso = toISODate(date);
        // A day someone wasn't employed on keeps the plans left over from
        // before, read-only, as in an earlier spell of someone since back;
        // any other closed day, such as a leaver's after their last day,
        // holds nothing.
        const closed = closedSpellOn(row.closedSpells, iso);
        const keepsLeftoverPlans =
          closed?.reason === "inactive" &&
          (entriesByDate.get(iso)?.length ?? 0) > 0;
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
          (hasNoFixedHours && entries.length === 0)
        ) {
          return (
            <td
              key={iso}
              className={cn(
                "border-r border-border/60 p-1.5 align-top",
                absence
                  ? ABSENCE_PATTERN
                  : (!isActive || isLocked(iso)) && "bg-muted/20",
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
              "h-px border-r border-border/60 p-0 align-top",
              absence && ABSENCE_PATTERN,
            )}
          >
            {/* The button's name is the day and its contents, read in order. */}
            <button
              type="button"
              onClick={() => onOpenDay(row, iso)}
              className="group flex h-full min-h-14 w-full flex-col gap-0.75 p-1.5 text-left hover:bg-brand/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
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

      <RowTotalCell
        minutes={row.plannedMinutes}
        isOver={overMinutes > 0}
        expectation={
          projectName
            ? `on ${projectName}`
            : hasNoFixedHours
              ? undefined
              : `of ${formatDuration(row.availableMinutes)}`
        }
      >
        {!projectName && !hasNoFixedHours && (
          <ReportBar
            value={row.plannedMinutes}
            reference={row.availableMinutes}
            fill="planned"
            label={`${formatDuration(row.plannedMinutes)} planned of ${formatDuration(row.availableMinutes)} available`}
            className="h-1.5 w-full max-w-28"
          />
        )}

        {!projectName && overMinutes > 0 && (
          <span
            title={`Planned ${formatDuration(overMinutes)} more than ${row.user.firstName} has available this week`}
            className="text-2xs font-medium whitespace-nowrap text-warning-text"
          >
            Over by {formatDuration(overMinutes)}
          </span>
        )}
      </RowTotalCell>
    </tr>
  );
};
