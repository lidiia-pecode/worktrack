import { cn } from "@/lib/utils/cn";

type ReportBarProps = {
  /** Logged minutes (planned ones on Planning). */
  value: number;
  /** What it is measured against: expected or planned minutes; 0 when there is none. */
  reference: number;
  /** The billable part of `value`, striped; left out where billing means nothing. */
  billable?: number;
  label: string;
  className?: string;
};

/**
 * One bar: logged time as a share of what it is measured against, full at or
 * past it, its billable part striped. Time past the reference ends the bar in
 * the warning colour, as Team time's week bar does, so "198h of 176h" doesn't
 * read as "176h of 176h". With nothing to measure against, logged time is a
 * full bar in a lighter teal, so it doesn't read as reaching a plan.
 */
export const ReportBar = ({
  value,
  reference,
  billable = 0,
  label,
  className,
}: ReportBarProps) => {
  const hasReference = reference > 0;
  const percent = hasReference
    ? Math.min(100, (value / reference) * 100)
    : value > 0
      ? 100
      : 0;
  const overShare =
    hasReference && value > reference ? ((value - reference) / value) * 100 : 0;
  const isOver = overShare > 0;
  // Past the reference the bar splits like Team time's week bar: the logged
  // part up to the reference, then the overrun on its own, never on top of it.
  const loggedWidth = isOver ? 100 - overShare : percent;
  const billableWidth =
    value > 0
      ? Math.min(100, (billable / (isOver ? reference : value)) * 100)
      : 0;

  return (
    // Spans, so a team row can put the bar beside its button.
    <span
      role="img"
      aria-label={label}
      className={cn(
        "relative block h-2 overflow-hidden rounded-full bg-report-track",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 overflow-hidden",
          !isOver && "rounded-full",
          hasReference ? "bg-report-logged" : "bg-report-unplanned",
        )}
        style={{ width: `${loggedWidth}%` }}
      >
        {billableWidth > 0 && (
          <span
            className="absolute inset-y-0 left-0 bg-stripes-billable"
            style={{ width: `${billableWidth}%` }}
          />
        )}
      </span>
      {isOver && (
        <span
          className="absolute inset-y-0 right-0 bg-warning/60"
          style={{ width: `${overShare}%` }}
        />
      )}
    </span>
  );
};
