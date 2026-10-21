import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import { BarValues, barMarks, HourScale } from "@/lib/utils/report-overview";

type HourBarProps = BarValues & {
  scale: HourScale;
  /** The bar's figures in words, for assistive technology. */
  label: string;
  className?: string;
};

/**
 * Hours on a scale shared by every bar of a card: the bar is logged time, the
 * line expected hours, the ring planned hours, and logged time past the line
 * (or past the ring, with no line) is striped. A missing value has no mark.
 */
export const HourBar = ({
  scale,
  label,
  className,
  ...values
}: HourBarProps) => {
  const { loggedPercent, pastPercent, linePercent, ringPercent } = barMarks(
    values,
    scale,
  );
  const inner = scale.ticks.slice(1, -1);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative h-2 rounded-full bg-report-track", className)}
    >
      {inner.map((tick) => (
        <span
          key={tick}
          className="absolute -inset-y-1.5 w-px bg-border/70"
          style={{ left: `${(tick / scale.endMinutes) * 100}%` }}
        />
      ))}
      {loggedPercent > 0 && (
        <span
          className={cn(
            "absolute inset-y-0 left-0 bg-brand",
            pastPercent > 0 ? "rounded-l-full" : "rounded-full",
          )}
          style={{ width: `${loggedPercent}%` }}
        />
      )}
      {pastPercent > 0 && (
        <span
          className="absolute inset-y-0 overflow-hidden rounded-r-full bg-brand"
          style={{ left: `${loggedPercent}%`, width: `${pastPercent}%` }}
        >
          {/* Its own layer: merged into one class list, the stripes would replace the colour. */}
          <span className="absolute inset-0 bg-stripes-overlay" />
        </span>
      )}
      {linePercent !== null && (
        <span
          className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
          style={{ left: `${linePercent}%` }}
        />
      )}
      {ringPercent !== null && (
        <span
          className="absolute top-1/2 size-2.5 -translate-1/2 rounded-full border-2 border-report-plan bg-card"
          style={{ left: `${ringPercent}%` }}
        />
      )}
    </div>
  );
};

/** The scale's hours, above the bars it belongs to. */
export const HourAxis = ({ scale }: { scale: HourScale }) => (
  <div
    aria-hidden
    className="relative h-4 text-2xs text-muted-foreground tabular-nums"
  >
    {scale.ticks.map((tick, index) => (
      <span
        key={tick}
        className={cn(
          "absolute bottom-0 whitespace-nowrap",
          index === 0
            ? ""
            : index === scale.ticks.length - 1
              ? "-translate-x-full"
              : "-translate-x-1/2",
        )}
        style={{ left: `${(tick / scale.endMinutes) * 100}%` }}
      >
        {formatDuration(tick)}
      </span>
    ))}
  </div>
);

type BarLegendProps = {
  /** People have expected hours; projects don't. */
  showExpected: boolean;
  /** What the striped part means, e.g. "Logged past expected". */
  past: string;
};

export const BarLegend = ({ showExpected, past }: BarLegendProps) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
    <li className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-4 rounded-full bg-brand" aria-hidden />
      Logged
    </li>
    {showExpected && (
      <li className="inline-flex items-center gap-1.5">
        <span className="h-3 w-0.5 rounded-full bg-foreground" aria-hidden />
        Expected
      </li>
    )}
    <li className="inline-flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-full border-2 border-report-plan"
        aria-hidden
      />
      Planned
    </li>
    <li className="inline-flex items-center gap-1.5">
      <span
        className="relative h-1.5 w-4 overflow-hidden rounded-full bg-brand"
        aria-hidden
      >
        <span className="absolute inset-0 bg-stripes-overlay" />
      </span>
      {past}
    </li>
  </ul>
);
