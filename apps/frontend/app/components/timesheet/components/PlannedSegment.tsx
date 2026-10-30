import { PlanningEntry } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import { getProjectColor } from "@/lib/utils/project-colors";

import { TWO_LINE_MIN_HEIGHT } from "../helpers/build-segments";
import { Segment } from "../types";

type PlannedSegmentProps = {
  segment: Segment<PlanningEntry>;
  dayLabel: string;
  /** Logs time on its project; without it the plan is only shown. */
  onClick?: (projectId: string) => void;
};

/** A plan on a day with nothing logged yet; opening it logs time on its project. */
export const PlannedSegment = ({
  segment,
  dayLabel,
  onClick,
}: PlannedSegmentProps) => {
  const { item: plan, offsetTop, height } = segment;
  const color = getProjectColor(plan.project.id);
  const duration = formatDuration(plan.plannedMinutes);
  const content = (
    <span className="flex h-full flex-col justify-center overflow-hidden px-2 py-1 text-left">
      {height < TWO_LINE_MIN_HEIGHT ? (
        <span className="truncate text-2xs text-muted-foreground">
          <span className="font-semibold text-foreground/70">
            {duration} planned
          </span>{" "}
          · {plan.project.name}
        </span>
      ) : (
        <>
          <span className="truncate text-2xs font-semibold leading-tight text-foreground/70">
            {duration} planned
          </span>
          <span className="truncate text-2xs leading-tight text-muted-foreground">
            {plan.project.name}
          </span>
        </>
      )}
    </span>
  );
  const className = cn(
    "absolute left-[3px] right-[3px] overflow-hidden rounded-md border border-dashed",
    onClick &&
      "cursor-pointer transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
  );
  // Fainter than an entry, so it reads as time not yet worked.
  const style = {
    top: offsetTop,
    height,
    backgroundColor: `oklch(from ${color} l c h / 0.1)`,
    borderColor: `oklch(from ${color} l c h / 0.7)`,
  };

  if (!onClick) {
    return (
      <div className={className} style={style}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Log time on ${dayLabel} for ${plan.project.name} (planned ${duration})`}
      onClick={(event) => {
        event.stopPropagation();
        onClick(plan.project.id);
      }}
      className={className}
      style={style}
    >
      {content}
    </button>
  );
};
