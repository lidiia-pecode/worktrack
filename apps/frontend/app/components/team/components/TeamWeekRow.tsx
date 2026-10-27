import { Absence, PlanningEntry, TeamSummaryRow } from "@/types";
import { formatDuration, toISODate } from "@/lib/utils/date";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

import { Avatar } from "../../shared/Avatar";
import { WeekBar } from "../../timesheet/components/WeekSummary";
import { Badge } from "@/components/ui/badge";
import { TeamDayCell } from "./TeamDayCell";
import { STICKY_PERSON_CELL } from "../../shared/week/sticky-column";

type TeamWeekRowProps = {
  row: TeamSummaryRow;
  weekDates: Date[];
  todayIso: string;
  absencesByDate: Record<string, Absence>;
  plansByDate: Record<string, PlanningEntry[]>;
  isLocked: (date: string) => boolean;
  /** The project the grid is filtered by: its hours say nothing about the week. */
  projectName?: string;
};

export const TeamWeekRow = ({
  row,
  weekDates,
  todayIso,
  absencesByDate,
  plansByDate,
  isLocked,
  projectName,
}: TeamWeekRowProps) => {
  const daysByDate = new Map(row.days.map((day) => [day.date, day]));
  const expectedByDate = new Map(
    row.expectedByDate.map((day) => [day.date, day.minutes]),
  );
  const name = fullName(row.user);

  return (
    <tr className="border-b border-border last:border-b-0">
      <th
        scope="row"
        className={cn(
          STICKY_PERSON_CELL,
          "p-0 text-left align-top font-normal",
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5 py-2 pr-1.5 pl-2.5">
          <Avatar user={row.user} size="md" />

          <PersonSummary row={row} projectName={projectName} />
        </div>
      </th>

      {weekDates.map((date) => {
        const iso = toISODate(date);
        const day = daysByDate.get(iso);

        return (
          <TeamDayCell
            key={iso}
            date={date}
            personName={name}
            entries={day?.entries ?? []}
            minutes={day?.minutes ?? 0}
            absence={absencesByDate[iso]}
            plans={plansByDate[iso]}
            expectedMinutes={projectName ? undefined : expectedByDate.get(iso)}
            isLocked={isLocked(iso)}
            isPast={iso < todayIso}
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

  const expectation = (() => {
    if (projectName) return `on ${projectName}`;
    if (!expectsTime) return "nothing expected";
    return `of ${formatDuration(row.expectedMinutes)}`;
  })();

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-px">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-medium text-foreground">
          {fullName(row.user)}
        </span>

        {isDeactivated && (
          <Badge variant="neutral" size="sm" className="shrink-0">
            Deactivated
          </Badge>
        )}
      </div>

      {row.user.position && (
        <span className="truncate text-xs text-muted-foreground">
          {row.user.position}
        </span>
      )}

      <span className="mt-1 flex items-baseline gap-1 text-xs tabular-nums">
        <span
          className={cn(
            "font-semibold",
            isOver ? "text-warning-text" : "text-foreground",
          )}
        >
          {formatDuration(row.minutes)}
        </span>

        <span className="truncate text-muted-foreground">{expectation}</span>
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
