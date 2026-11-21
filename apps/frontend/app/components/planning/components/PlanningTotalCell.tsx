import { PlanningRow } from "@/types";
import { formatDuration, formatReportHours } from "@/lib/utils/date";

import { TooltipTrigger, type TooltipHandle } from "@/components/ui/tooltip";

import { RowTotalCell } from "../../shared/week/RowTotalCell";
import { ReportBar } from "../../reports/components/ReportBar";
import { hasNoFixedHours } from "./PlanningPersonCell";

type PlanningTotalCellProps = {
  row: PlanningRow;
  /** Names the period in the "over" tip; a month reads in decimal hours, as Reports. */
  period: "week" | "month";
  /** Set under a project filter: the row holds that project's plans only. */
  projectName?: string;
  tooltip: TooltipHandle<string>;
};

/** A Planning row's planned hours against what the person has available. */
export const PlanningTotalCell = ({
  row,
  period,
  projectName,
  tooltip,
}: PlanningTotalCellProps) => {
  const noFixedHours = hasNoFixedHours(row);
  const formatHours = period === "month" ? formatReportHours : formatDuration;
  const overMinutes =
    projectName || noFixedHours
      ? 0
      : Math.max(0, row.plannedMinutes - row.availableMinutes);

  return (
    <RowTotalCell
      minutes={row.plannedMinutes}
      isOver={overMinutes > 0}
      // Quiet when planned exactly to what is available: the full bar says so.
      expectation={
        projectName
          ? `on ${projectName}`
          : noFixedHours || row.plannedMinutes === row.availableMinutes
            ? undefined
            : `of ${formatHours(row.availableMinutes)}`
      }
      formatHours={formatHours}
    >
      {!projectName && !noFixedHours && (
        <ReportBar
          value={row.plannedMinutes}
          reference={row.availableMinutes}
          fill="planned"
          label={`${formatHours(row.plannedMinutes)} planned of ${formatHours(row.availableMinutes)} available`}
          className="h-1.5 w-full max-w-28"
        />
      )}

      {overMinutes > 0 && (
        <TooltipTrigger
          handle={tooltip}
          payload={`Planned ${formatHours(overMinutes)} more than ${row.user.firstName} has available this ${period}`}
          render={<span />}
          className="text-2xs font-medium whitespace-nowrap text-warning-text"
        >
          Over by {formatHours(overMinutes)}
        </TooltipTrigger>
      )}
    </RowTotalCell>
  );
};
