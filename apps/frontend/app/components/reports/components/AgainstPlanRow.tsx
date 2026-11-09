import { HoursReportRow } from "@/types";
import { formatReportHours } from "@/lib/utils/date";

import { ReportBar } from "./ReportBar";
import { ReportRow } from "./ReportRow";

type AgainstPlanRowProps = {
  row: HoursReportRow;
  detail?: string | null;
};

/** A project's or a person's logged time against the plan: one bar, "139h of 88h". */
export const AgainstPlanRow = ({ row, detail }: AgainstPlanRowProps) => {
  const { name } = row;
  const planned = row.plannedMinutes ?? 0;
  const figure =
    planned > 0
      ? `${formatReportHours(row.totalMinutes)} of ${formatReportHours(planned)}`
      : formatReportHours(row.totalMinutes);

  return (
    <ReportRow
      name={name}
      detail={detail}
      bar={
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
      }
      figure={figure}
      subFigure={
        planned === 0 ? (
          "no plan"
        ) : row.totalMinutes > planned ? (
          <span className="text-warning-text">
            +{formatReportHours(row.totalMinutes - planned)} over
          </span>
        ) : undefined
      }
    />
  );
};
