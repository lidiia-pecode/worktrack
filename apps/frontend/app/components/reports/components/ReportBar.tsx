import { cn } from "@/lib/utils/cn";

type ReportBarProps = {
  /** The minutes drawn: logged ones, or planned ones on Planning. */
  value: number;
  /** What it is measured against: expected or planned minutes; 0 when there is none. */
  reference: number;
  /** Planned time is drawn in the plan's mauve, logged time in teal. */
  fill?: "logged" | "planned";
  /** The track says what the bar is measured against, in that figure's colour. */
  measuredAgainst?: "expected" | "planned";
  /** The billable part of `value`, striped; left out where billing means nothing. */
  billable?: number;
  /** Said to screen readers; none where the text beside the bar says it. */
  label?: string;
  className?: string;
};

const FILLS = {
  logged: "bg-report-logged",
  planned: "bg-report-planned",
};

const TRACKS = {
  expected: "bg-report-expected",
  planned: "bg-report-planned-track",
};

/**
 * Time against its reference, in the colours every hour figure uses: logged
 * teal with its billable part striped, or the plan's mauve, on a track of
 * what it is measured against. Time past the reference ends the bar in the
 * warning colour; with no reference the bar is full in a lighter teal, so it
 * doesn't read as on plan.
 */
export const ReportBar = ({
  value,
  reference,
  fill = "logged",
  measuredAgainst = "expected",
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
  // Past the reference the filled part stops at it and the overrun follows.
  const filledWidth = isOver ? 100 - overShare : percent;
  // The stripes are a share of the filled part, which past the reference
  // stands for only the reference's minutes.
  const filledMinutes = isOver ? reference : value;
  const billableWidth =
    value > 0 ? Math.min(100, (billable / filledMinutes) * 100) : 0;

  return (
    // A span, so it can sit inside the inline content around it.
    <span
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
      className={cn(
        "relative block h-2 overflow-hidden rounded-full",
        hasReference ? TRACKS[measuredAgainst] : "bg-report-track",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 overflow-hidden",
          !isOver && "rounded-full",
          hasReference || fill === "planned"
            ? FILLS[fill]
            : "bg-report-unplanned",
        )}
        style={{ width: `${filledWidth}%` }}
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
          className="absolute inset-y-0 right-0 bg-warning"
          style={{ width: `${overShare}%` }}
        />
      )}
    </span>
  );
};
