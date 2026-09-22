import { Absence, TeamSummaryRow } from "@/types";
import { formatDuration, isWeekend, toISODate } from "@/lib/utils/date";
import { ABSENCE_TYPE_SHORT_LABELS } from "@/lib/utils/absence";
import { fullName } from "@/lib/utils/user";

import { Avatar } from "../../shared/Avatar";
import { Badge } from "@/components/ui/badge";

type TeamWeekRowProps = {
  row: TeamSummaryRow;
  weekDates: Date[];
  absencesByDate: Record<string, Absence>;
  onOpen: (row: TeamSummaryRow) => void;
};

export function TeamWeekRow({
  row,
  weekDates,
  absencesByDate,
  onOpen,
}: TeamWeekRowProps) {
  const minutesByDate = new Map(row.days.map((day) => [day.date, day.minutes]));

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
          className="flex w-full min-w-0 items-center gap-2.5 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
        >
          <Avatar user={row.user} />

          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">
              {fullName(row.user)}
            </span>

            {row.user.position && (
              <span className="block truncate text-xs text-muted-foreground">
                {row.user.position}
              </span>
            )}
          </span>
        </button>
      </th>

      {weekDates.map((date) => {
        const iso = toISODate(date);
        const minutes = minutesByDate.get(iso) ?? 0;
        const absence = absencesByDate[iso];

        return (
          <td
            key={iso}
            className={`
              border-r border-border/60 p-3 text-center text-sm tabular-nums
              ${absence ? "bg-brand-subtle" : ""}
              ${!absence && isWeekend(date) ? "bg-muted/20" : ""}
            `}
          >
            {absence ? (
              <Badge variant="default" className="text-[10px]">
                {ABSENCE_TYPE_SHORT_LABELS[absence.type]}
              </Badge>
            ) : minutes > 0 ? (
              <span className="font-medium text-foreground">
                {formatDuration(minutes)}
              </span>
            ) : (
              <span className="text-muted-foreground/60">-</span>
            )}
          </td>
        );
      })}

      <td className="p-3 text-right text-sm whitespace-nowrap tabular-nums">
        <span className="font-semibold text-foreground">
          {formatDuration(row.minutes)}
        </span>

        <span className="ml-1.5 text-xs text-muted-foreground">
          / {formatDuration(row.expectedMinutes)}
        </span>
      </td>
    </tr>
  );
}
