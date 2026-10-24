import { cn } from "@/lib/utils/cn";

type ReportBarProps = {
  /** Logged minutes. */
  value: number;
  /** What it is measured against: expected or planned minutes; 0 when there is none. */
  reference: number;
  label: string;
  className?: string;
};

/**
 * One bar: logged time as a share of what it is measured against, full at or
 * past it. With nothing to measure against, logged time is a full bar in a
 * lighter teal, so it doesn't read as reaching a plan.
 */
export const ReportBar = ({
  value,
  reference,
  label,
  className,
}: ReportBarProps) => {
  const hasReference = reference > 0;
  const percent = hasReference
    ? Math.min(100, (value / reference) * 100)
    : value > 0
      ? 100
      : 0;

  return (
    // Spans, so a team row can put the bar inside its button.
    <span
      role="img"
      aria-label={label}
      className={cn("block h-2 rounded-full bg-report-track", className)}
    >
      <span
        className={cn(
          "block h-full rounded-full",
          hasReference ? "bg-brand" : "bg-report-unplanned",
        )}
        style={{ width: `${percent}%` }}
      />
    </span>
  );
};
