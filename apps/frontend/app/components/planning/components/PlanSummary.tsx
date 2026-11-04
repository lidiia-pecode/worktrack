import { ReactNode } from "react";

import { formatDuration } from "@/lib/utils/date";
import { getProjectColor } from "@/lib/utils/project-colors";
import { cn } from "@/lib/utils/cn";

import { DayShare } from "./period-lines";

type PlanSummaryProps = {
  /** The figure over the bar: "6h planned", "Up to 5h a day". */
  heading: string;
  /** The person's own day, so the bar has its full width. */
  dayLimitMinutes: number;
  /** Each project's share of the fullest day, in its colour. */
  shares: DayShare[];
  /** What saving changes, one line per project; none while nothing changed. */
  changes: string[];
  /** The figures are being rechecked, so they may still move. */
  isOutdated?: boolean;
  /** What the dialog adds beneath: skipped days, refusals, what doesn't fit. */
  children?: ReactNode;
};

/** What saving would do: the fullest day as a bar, then each change. */
export const PlanSummary = ({
  heading,
  dayLimitMinutes,
  shares,
  changes,
  isOutdated = false,
  children,
}: PlanSummaryProps) => (
  <div
    className={cn(
      "space-y-3 rounded-xl bg-brand-subtle p-4 text-sm transition-opacity",
      isOutdated && "opacity-60",
    )}
    aria-busy={isOutdated}
  >
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-foreground tabular-nums">
          {heading}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {formatDuration(dayLimitMinutes)} working day
        </span>
      </div>

      <div
        className="flex h-2 overflow-hidden rounded-full bg-brand-muted"
        aria-hidden
      >
        {shares.map((share) => (
          <div
            key={share.projectId}
            style={{
              width: `${Math.min(100, (share.minutes / dayLimitMinutes) * 100)}%`,
              backgroundColor: getProjectColor(share.projectId),
            }}
          />
        ))}
      </div>
    </div>

    {changes.length > 0 && (
      <div className="space-y-1 text-foreground">
        <p className="font-medium">
          Saving will
          {isOutdated && (
            <span className="font-normal text-muted-foreground">
              {" "}
              (updating…)
            </span>
          )}
        </p>
        <ul className="list-disc space-y-0.5 pl-4">
          {changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      </div>
    )}

    {children}
  </div>
);
