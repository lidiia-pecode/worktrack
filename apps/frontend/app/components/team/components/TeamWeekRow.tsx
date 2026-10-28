"use client";

import { useEffect, useRef } from "react";
import { CalendarOff } from "lucide-react";

import { Absence, PlanningEntry, TeamSummaryRow, TimeLog } from "@/types";
import { formatDuration, isoDateInTimeZone, toISODate } from "@/lib/utils/date";
import { isRangeLocked } from "@/lib/utils/reporting-period";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

import { Badge } from "@/components/ui/badge";
import { Avatar } from "../../shared/Avatar";
import { WeekBar } from "../../timesheet/components/WeekSummary";
import { Button } from "@/components/ui/button";
import { TeamDayCell } from "./TeamDayCell";
import { STICKY_PERSON_CELL } from "../../shared/week/sticky-column";

type TeamWeekRowProps = {
  row: TeamSummaryRow;
  weekDates: Date[];
  todayIso: string;
  /** The company's time zone: it says which day a deactivation fell on. */
  timezone?: string;
  absencesByDate: Record<string, Absence>;
  plansByDate: Record<string, PlanningEntry[]>;
  isLocked: (date: string) => boolean;
  isEditable: (date: string) => boolean;
  /** The project the grid is filtered by: its hours say nothing about the week. */
  projectName?: string;
  /** The viewer may write this person's time; for a deactivated person, only the days before they left. */
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
  timezone,
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
  // A leaver's last month can still be corrected, up to the day they left.
  const leaveDay = row.user.deactivatedAt
    ? isoDateInTimeZone(new Date(row.user.deactivatedAt), timezone)
    : undefined;
  const isBeforeLeaving = (iso: string) => !leaveDay || iso < leaveDay;

  useEffect(() => {
    if (isHighlighted) rowRef.current?.scrollIntoView({ block: "center" });
  }, [isHighlighted]);

  return (
    <tr
      ref={rowRef}
      className={cn(
        "border-b border-border last:border-b-0",
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
        <div className="flex min-w-0 items-start gap-2.5 py-2 pr-1.5 pl-2.5">
          <Avatar user={row.user} size="md" />

          <PersonSummary row={row} projectName={projectName} />

          {canWrite && isBeforeLeaving(toISODate(weekDates[0])) && (
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={onAddAbsence}
              aria-label={`Add an absence for ${name}`}
              className="shrink-0 text-muted-foreground"
            >
              <CalendarOff aria-hidden />
            </Button>
          )}
        </div>
      </th>

      {weekDates.map((date) => {
        const iso = toISODate(date);
        const day = daysByDate.get(iso);
        const absence = absencesByDate[iso];
        const canWriteDay = canWrite && isEditable(iso) && isBeforeLeaving(iso);
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
    </tr>
  );
};

type PersonSummaryProps = {
  row: TeamSummaryRow;
  projectName?: string;
};

/** Who the row is, and their week against what was expected of them. */
const PersonSummary = ({ row, projectName }: PersonSummaryProps) => {
  const isDeactivated = isDeactivatedUser(row.user);
  const expectsTime = !isDeactivated && row.expectedMinutes > 0;
  const isOver = !projectName && row.minutes > row.expectedMinutes;
  const showsBar = !projectName && expectsTime;

  // Someone expected nothing shows their hours alone.
  const expectation = (() => {
    if (projectName) return `on ${projectName}`;
    if (!expectsTime) return null;
    return `of ${formatDuration(row.expectedMinutes)}`;
  })();

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-px">
      <span className="truncate text-sm font-medium text-foreground">
        {fullName(row.user)}
      </span>

      {row.user.position && (
        <span className="truncate text-xs text-muted-foreground">
          {row.user.position}
        </span>
      )}

      <span className="mt-1 flex items-center gap-1 text-xs tabular-nums">
        <span
          className={cn(
            "font-semibold",
            isOver ? "text-warning-text" : "text-foreground",
          )}
        >
          {formatDuration(row.minutes)}
        </span>

        {expectation && !isDeactivated ? (
          <span className="truncate text-muted-foreground">{expectation}</span>
        ) : (
          <Badge variant="neutral" className="mt-0.5 self-start">
            Deactivated
          </Badge>
        )}
      </span>

      {showsBar && (
        <span className="mt-0.5 flex w-28">
          <WeekBar
            billableMinutes={row.billableMinutes}
            nonBillableMinutes={row.nonBillableMinutes}
            expectedMinutes={row.expectedMinutes}
          />
        </span>
      )}
    </div>
  );
};
