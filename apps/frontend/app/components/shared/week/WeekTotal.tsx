import { formatDuration } from "@/lib/utils/date";

import { ReportBar } from "../../reports/components/ReportBar";

type WeekTotalProps = {
  /** "Logged" or "Planned": what the figure is of. */
  label: string;
  minutes: number;
  /** What the figure is measured against; left out when nothing fits, as under a project filter. */
  ofMinutes?: number;
  /** The billable part of logged time, striped in the bar. */
  billableMinutes?: number;
  fill?: "logged" | "planned";
};

/**
 * A page's total for its period, in the toolbar: "Logged 30h / 128h" over its
 * bar. Without anything to measure against, the hours stand alone.
 */
export const WeekTotal = ({
  label,
  minutes,
  ofMinutes,
  billableMinutes,
  fill = "logged",
}: WeekTotalProps) => (
  <span className="inline-flex min-w-0 flex-col items-stretch gap-1 text-sm leading-4">
    <span className="text-right whitespace-nowrap tabular-nums">
      {label}{" "}
      <span className="font-medium text-foreground">
        {formatDuration(minutes)}
      </span>
      {ofMinutes !== undefined && (
        <span className="text-muted-foreground">
          {" "}
          / {formatDuration(ofMinutes)}
        </span>
      )}
    </span>

    {ofMinutes !== undefined && ofMinutes > 0 && (
      <ReportBar
        value={minutes}
        reference={ofMinutes}
        fill={fill}
        billable={billableMinutes}
        className="h-1.5 w-full"
      />
    )}
  </span>
);
