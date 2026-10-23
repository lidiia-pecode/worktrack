import { HoursReportRow } from "@/types";
import { formatReportHours } from "@/lib/utils/date";

import { ReportBar } from "./ReportBar";
import { ReportRow } from "./ReportRow";

type AgainstPlanRowProps = {
  row: HoursReportRow;
  detail?: string | null;
  /** Why it is in Needs attention, when it is. */
  flag?: string;
  onOpen?: () => void;
};

/** A project's or a person's logged time against the plan: one bar, "139h of 88h". */
export const AgainstPlanRow = ({
  row,
  detail,
  flag,
  onOpen,
}: AgainstPlanRowProps) => {
  const name = row.name ?? "";
  const planned = row.plannedMinutes ?? 0;
  const figure =
    planned > 0
      ? `${formatReportHours(row.totalMinutes)} of ${formatReportHours(planned)}`
      : formatReportHours(row.totalMinutes);

  return (
    <ReportRow
      name={name}
      onOpen={onOpen}
      detail={detail}
      flag={flag}
      bar={
        <ReportBar
          value={row.totalMinutes}
          reference={planned}
          label={
            planned > 0
              ? `${name}: ${figure} planned`
              : `${name}: ${figure} logged, no plan`
          }
        />
      }
      figure={figure}
      subFigure={planned > 0 ? undefined : "no plan"}
    />
  );
};
