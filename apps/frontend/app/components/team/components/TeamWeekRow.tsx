import { TeamSummaryRow } from "@/types";
import { formatDuration, isWeekend, toISODate } from "@/lib/utils/date";
import { fullName } from "@/lib/utils/user";

import { Avatar } from "../../shared/Avatar";

type TeamWeekRowProps = {
  row: TeamSummaryRow;
  weekDates: Date[];
  expectedMinutes: number;
};

export function TeamWeekRow({
  row,
  weekDates,
  expectedMinutes,
}: TeamWeekRowProps) {
  const minutesByDate = new Map(row.days.map((day) => [day.date, day.minutes]));

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-muted/10">
      <th
        scope="row"
        className="border-r border-border/60 p-3 text-left font-normal"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar user={row.user} />

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {fullName(row.user)}
            </p>

            {row.user.position && (
              <p className="truncate text-xs text-muted-foreground">
                {row.user.position}
              </p>
            )}
          </div>
        </div>
      </th>

      {weekDates.map((date) => {
        const iso = toISODate(date);
        const minutes = minutesByDate.get(iso) ?? 0;

        return (
          <td
            key={iso}
            className={`
              border-r border-border/60 p-3 text-center text-sm tabular-nums
              ${isWeekend(date) ? "bg-muted/20" : ""}
            `}
          >
            {minutes > 0 ? (
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
          / {formatDuration(expectedMinutes)}
        </span>
      </td>
    </tr>
  );
}
