import { Absence, TeamSummaryRow } from "@/types";
import { UserStatus } from "@/types/enums";
import { formatDuration, isWeekend, toISODate } from "@/lib/utils/date";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { fullName } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

import { PersonLabel } from "../../shared/PersonLabel";
import { dayFill, isOverFill } from "../../timesheet/helpers/day-fill";
import { Badge } from "@/components/ui/badge";

type TeamWeekRowProps = {
  row: TeamSummaryRow;
  weekDates: Date[];
  absencesByDate: Record<string, Absence>;
  showsExpected: boolean;
  onOpen: (row: TeamSummaryRow) => void;
};

export const TeamWeekRow = ({
  row,
  weekDates,
  absencesByDate,
  showsExpected,
  onOpen,
}: TeamWeekRowProps) => {
  const minutesByDate = new Map(row.days.map((day) => [day.date, day.minutes]));
  const expectedByDate = new Map(
    row.expectedByDate.map((day) => [day.date, day.minutes]),
  );

  // The whole row opens the person for the mouse; the keyboard has the name's
  // button, so the row adds no second tab stop.
  return (
    <tr
      onClick={() => onOpen(row)}
      className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/10"
    >
      <th
        scope="row"
        className="border-r border-border/60 p-0 text-left font-normal"
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row);
          }}
          aria-label={`Open ${fullName(row.user)}'s entries`}
          className="flex w-full min-w-0 items-center gap-2.5 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <PersonLabel user={row.user} />

          {row.user.status === UserStatus.DEACTIVATED && (
            <Badge variant="neutral" size="sm" className="ml-auto shrink-0">
              Deactivated
            </Badge>
          )}
        </button>
      </th>

      {weekDates.map((date) => {
        const iso = toISODate(date);
        const minutes = minutesByDate.get(iso) ?? 0;
        const absence = absencesByDate[iso];
        // Hours on one project say nothing about the day as a whole.
        const fill = dayFill({
          isAbsent: Boolean(absence),
          isWeekend: isWeekend(date),
          minutes,
          expectedMinutes: showsExpected ? expectedByDate.get(iso) : undefined,
        });

        return (
          <td
            key={iso}
            className={cn(
              "border-r border-border/60 p-3 text-center text-sm tabular-nums",
              fill,
            )}
          >
            {absence ? (
              <Badge variant="default" className="text-2xs">
                {ABSENCE_TYPE_SHORT_LABELS[absence.type]}
              </Badge>
            ) : minutes > 0 ? (
              <span
                className={cn(
                  "font-medium",
                  isOverFill(fill) ? "text-warning-text" : "text-foreground",
                )}
              >
                {formatDuration(minutes)}
              </span>
            ) : (
              <>
                <span aria-hidden className="text-muted-foreground">
                  -
                </span>
                <span className="sr-only">No time</span>
              </>
            )}
          </td>
        );
      })}

      <td className="p-3 text-right text-sm whitespace-nowrap tabular-nums">
        <span className="font-semibold text-foreground">
          {formatDuration(row.minutes)}
        </span>

        {showsExpected && (
          <span className="ml-1.5 text-xs text-muted-foreground">
            / {formatDuration(row.expectedMinutes)}
          </span>
        )}
      </td>
    </tr>
  );
};
