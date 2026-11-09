import { HoursReportRow } from "@/types";
import { formatReportHours } from "@/lib/utils/date";
import { hoursAgainst } from "@/lib/utils/report-overview";

import { ReportBar } from "./ReportBar";

type AgainstPlanRowProps = {
  row: HoursReportRow;
  detail?: string | null;
};

/**
 * A project's or a person's logged time against the plan: the name, one bar
 * and "139h of 88h". In a narrow list (an `@container`) the name sits above
 * the bar and the figures.
 */
export const AgainstPlanRow = ({ row, detail }: AgainstPlanRowProps) => {
  const { name } = row;
  const planned = row.plannedMinutes ?? 0;
  const figure = hoursAgainst(row.totalMinutes, planned);

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-x-4 gap-y-2 border-t border-border/40 py-3 @sm:grid-cols-[minmax(10rem,1.4fr)_minmax(0,1fr)_9rem]">
      <div className="col-span-2 min-w-0 @sm:col-span-1">
        <p title={name} className="line-clamp-2 text-sm font-medium">
          {name}
        </p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <div className="min-w-0">
        <ReportBar
          value={row.totalMinutes}
          reference={planned}
          measuredAgainst="planned"
          billable={row.billableMinutes}
          label={
            planned > 0
              ? `${name}: ${figure} planned`
              : `${name}: ${figure} logged, no plan`
          }
        />
      </div>
      <div className="text-right tabular-nums">
        <p className="text-sm font-medium whitespace-nowrap">{figure}</p>
        {planned === 0 ? (
          <p className="text-xs text-muted-foreground">no plan</p>
        ) : (
          row.totalMinutes > planned && (
            <p className="text-xs text-warning-text">
              +{formatReportHours(row.totalMinutes - planned)} over
            </p>
          )
        )}
      </div>
    </li>
  );
};
