"use client";

import { useEffect, useRef } from "react";
import { CalendarOff } from "lucide-react";

import { Absence, PlanningEntry, TeamSummaryRow, TimeLog } from "@/types";
import { formatDuration, toISODate } from "@/lib/utils/date";
import { isRangeLocked } from "@/lib/utils/reporting-period";
import {
  closedSpellOn,
  fullName,
  isClosedOn,
  leaverLabel,
  moveLabel,
} from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";
import { factsLine } from "@/lib/utils/text";

import { PersonLabel } from "../../shared/PersonLabel";
import { WeekBar } from "../../timesheet/components/WeekSummary";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TeamDayCell } from "./TeamDayCell";
import { STICKY_PERSON_CELL } from "../../shared/week/sticky-column";
import { ClosedDayCell } from "../../shared/week/ClosedDayCell";

type TeamWeekRowProps = {
  row: TeamSummaryRow;
  weekDates: Date[];
  todayIso: string;
  absencesByDate: Record<string, Absence>;
  plansByDate: Record<string, PlanningEntry[]>;
  isLocked: (date: string) => boolean;
  isEditable: (date: string) => boolean;
  /** The project the grid is filtered by: its hours say nothing about the week. */
  projectName?: string;
  /** The viewer may write this person's time, on the days they were active. */
  canWrite: boolean;
  /** Named by a link, so the row is marked and scrolled to. */
  isHighlighted: boolean;
  /** The day whose form waits for the person's activities to load. */
  busyDate?: string;
  onEditEntry: (timelog: TimeLog) => void;
  onAdd: (date: Date, plannedProjectId?: string) => void;
  onAbsenceClick: (absence: Absence) => void;
  onAddAbsence: () => void;
};

export const TeamWeekRow = ({
  row,
  weekDates,
  todayIso,
  absencesByDate,
  plansByDate,
  isLocked,
  isEditable,
  projectName,
  canWrite,
  isHighlighted,
  busyDate,
  onEditEntry,
  onAdd,
  onAbsenceClick,
  onAddAbsence,
}: TeamWeekRowProps) => {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const daysByDate = new Map(row.days.map((day) => [day.date, day]));
  const expectedByDate = new Map(
    row.expectedByDate.map((day) => [day.date, day.minutes]),
  );
  const name = fullName(row.user);

  useEffect(() => {
    if (isHighlighted) rowRef.current?.scrollIntoView({ block: "center" });
  }, [isHighlighted]);

  return (
    <tr
      ref={rowRef}
      className={cn(
        "group/row border-b border-border last:border-b-0",
        isHighlighted && "bg-brand-subtle",
      )}
    >
      <th
        scope="row"
        className={cn(
          STICKY_PERSON_CELL,
          "p-0 text-left align-top font-normal",
        )}
        // The sticky cell needs its opaque ground, so the tint is laid over it.
        style={
          isHighlighted
            ? {
                backgroundImage:
                  "linear-gradient(var(--brand-subtle), var(--brand-subtle))",
              }
            : undefined
        }
      >
        <div className="relative flex min-w-0 items-start gap-2.5 py-2 pr-1.5 pl-2.5">
          <PersonLabel user={row.user}>{personFacts(row)}</PersonLabel>

          {canWrite &&
            weekDates.some(
              (date) => !isClosedOn(row.closedSpells, toISODate(date)),
            ) && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      onClick={onAddAbsence}
                      aria-label={`Add an absence for ${name}`}
                      // Shown on the row's hover or focus, over the name's
                      // end, as Planning offers a period; always there on
                      // touch.
                      className="shrink-0 bg-card text-muted-foreground transition-opacity pointer-fine:absolute pointer-fine:top-2 pointer-fine:right-1.5 pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100 pointer-fine:focus-visible:opacity-100"
                    />
                  }
                >
                  <CalendarOff aria-hidden />
                </TooltipTrigger>
                <TooltipContent>Add an absence</TooltipContent>
              </Tooltip>
            )}
        </div>
      </th>

      {weekDates.map((date) => {
        const iso = toISODate(date);
        // The API refuses a day outside the team in view or the person's
        // employment, so it holds nothing here.
        const closed = closedSpellOn(row.closedSpells, iso);
        if (closed) return <ClosedDayCell key={iso} reason={closed.reason} />;

        const day = daysByDate.get(iso);
        const absence = absencesByDate[iso];
        const canWriteDay = canWrite && isEditable(iso);
        // Time is logged only for a day that has happened.
        const canLogTime = canWriteDay && iso <= todayIso;
        // An absence is frozen whole once any of its days locks; it then
        // opens to be read, as on the timesheet.
        const opensAbsence =
          !!absence &&
          canWrite &&
          (canWriteDay ||
            isRangeLocked(isLocked, absence.startDate, absence.endDate));

        return (
          <TeamDayCell
            key={iso}
            date={date}
            personName={name}
            entries={day?.entries ?? []}
            minutes={day?.minutes ?? 0}
            absence={absence}
            plans={plansByDate[iso]}
            expectedMinutes={projectName ? undefined : expectedByDate.get(iso)}
            isLocked={isLocked(iso)}
            isPast={iso < todayIso}
            isBusy={busyDate === iso}
            onEditEntry={canWriteDay ? onEditEntry : undefined}
            onAdd={canLogTime ? () => onAdd(date) : undefined}
            onPlanClick={
              canLogTime ? (projectId) => onAdd(date, projectId) : undefined
            }
            onAbsenceClick={
              opensAbsence ? () => onAbsenceClick(absence) : undefined
            }
          />
        );
      })}

      <WeekTotalCell row={row} projectName={projectName} />
    </tr>
  );
};

/** Moves and a last day this week, under the person's position. */
const personFacts = (row: TeamSummaryRow) =>
  factsLine([
    ...row.moves.map(moveLabel),
    leaverLabel(row.user),
    row.isOnProject === false && "Former member",
  ]);

type WeekTotalCellProps = {
  row: TeamSummaryRow;
  projectName?: string;
};

/**
 * The person's week against what was expected of them, in the right column as
 * Planning shows a week's plans; under a project filter only its hours.
 */
const WeekTotalCell = ({ row, projectName }: WeekTotalCellProps) => {
  // A leaver is expected time up to the day they left, as on Reports.
  const expectsTime = row.expectedMinutes > 0;
  const isOver =
    !projectName && expectsTime && row.minutes > row.expectedMinutes;
  const showsBar = !projectName && expectsTime;

  // Someone expected nothing shows their hours alone.
  const expectation = (() => {
    if (projectName) return `on ${projectName}`;
    if (!expectsTime) return null;
    return `of ${formatDuration(row.expectedMinutes)}`;
  })();

  return (
    <td className="p-3 align-top">
      <div className="flex flex-col items-end gap-1.5">
        <span className="text-right text-xs tabular-nums">
          <span
            className={cn(
              "font-semibold whitespace-nowrap",
              isOver ? "text-warning-text" : "text-foreground",
            )}
          >
            {formatDuration(row.minutes)}
          </span>

          {/* A long week breaks between the figures, never inside one. */}
          {expectation && (
            <>
              {" "}
              <span className="whitespace-nowrap text-muted-foreground">
                {expectation}
              </span>
            </>
          )}
        </span>

        {showsBar && (
          <span className="flex w-full max-w-28">
            <WeekBar
              billableMinutes={row.billableMinutes}
              nonBillableMinutes={row.nonBillableMinutes}
              expectedMinutes={row.expectedMinutes}
            />
          </span>
        )}
      </div>
    </td>
  );
};
