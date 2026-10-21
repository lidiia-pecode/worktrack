import { cn } from "@/lib/utils/cn";
import {
  markerPercent,
  REFERENCE_PERCENT,
  targetBarGeometry,
} from "@/lib/utils/report-overview";

type TargetBarProps = {
  value: number;
  /** What the value is measured against, drawn as a line at the same place on every bar. */
  reference: number;
  /** Drawn as a ring along the same scale, when there is any. */
  planned?: number;
  /** The bar's figures in words, for assistive technology. */
  label: string;
  className?: string;
};

/**
 * Logged time against expected or planned hours. Past the reference the bar
 * turns striped, and beyond its end it fades, since the figure beside it says
 * how far it went. With no reference it draws nothing.
 */
export const TargetBar = ({
  value,
  reference,
  planned,
  label,
  className,
}: TargetBarProps) => {
  const geometry = targetBarGeometry(value, reference);
  if (!geometry) return null;

  const { filledPercent, pastPercent, isCapped } = geometry;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative h-2 rounded-full bg-report-track", className)}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 bg-brand",
          pastPercent > 0 ? "rounded-l-full" : "rounded-full",
        )}
        style={{ width: `${filledPercent}%` }}
      />
      {pastPercent > 0 && (
        <span
          className={cn(
            "absolute inset-y-0 overflow-hidden bg-brand",
            isCapped ? "mask-r-from-60% rounded-r-none" : "rounded-r-full",
          )}
          style={{ left: `${filledPercent}%`, width: `${pastPercent}%` }}
        >
          {/* Its own layer: merged into one class list, the stripes would replace the colour. */}
          <span className="absolute inset-0 bg-stripes-overlay" />
        </span>
      )}
      <span
        className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
        style={{ left: `${REFERENCE_PERCENT}%` }}
      />
      {Boolean(planned) && (
        <span
          className="absolute top-1/2 size-2.5 -translate-1/2 rounded-full border-2 border-report-plan bg-card"
          style={{ left: `${markerPercent(planned!, reference)}%` }}
        />
      )}
    </div>
  );
};

type TargetBarLegendProps = {
  /** What the line stands for, e.g. "Expected". */
  reference: string;
  /** What the striped part stands for, e.g. "Past expected". */
  past: string;
  showPlanned?: boolean;
};

export const TargetBarLegend = ({
  reference,
  past,
  showPlanned = false,
}: TargetBarLegendProps) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
    <li className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-4 rounded-full bg-brand" aria-hidden />
      Logged
    </li>
    <li className="inline-flex items-center gap-1.5">
      <span
        className="h-1.5 w-4 rounded-full bg-brand bg-stripes-overlay"
        aria-hidden
      />
      {past}
    </li>
    <li className="inline-flex items-center gap-1.5">
      <span className="h-3 w-0.5 rounded-full bg-foreground" aria-hidden />
      {reference}
    </li>
    {showPlanned && (
      <li className="inline-flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-full border-2 border-report-plan"
          aria-hidden
        />
        Planned
      </li>
    )}
  </ul>
);
