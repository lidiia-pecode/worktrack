import { formatDuration } from "@/lib/utils/date";
import { Segment } from "../types";
import { TimeLog } from "@/types";
import { getProjectColor } from "@/lib/utils/project-colors";
import { OVERTIME_SEGMENT_PATTERN } from "../consts";
import { getTimelogDisplay } from "@/lib/utils/timelog";
import { cn } from "@/lib/utils/cn";

type TimelogSegmentProps = {
  segment: Segment;
  onClick?: (timelog: TimeLog) => void;
  onHover: (timelog: TimeLog, target: HTMLElement) => void;
  onLeave: () => void;
};

export const TimelogSegment = ({
  segment,
  onClick,
  onHover,
  onLeave,
}: TimelogSegmentProps) => {
  const { timelog, offsetTop, height, overtimeHeight } = segment;
  const { colorSeed, projectName, activityName } = getTimelogDisplay(timelog);
  const color = getProjectColor(colorSeed);

  // A read-only entry stays focusable so its details can still be shown by
  // keyboard, but has no hover, so it doesn't look clickable.
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${formatDuration(timelog.minutes)} — ${projectName} / ${activityName}`}
      aria-disabled={!onClick}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(timelog);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;

        e.preventDefault();
        e.stopPropagation();
        onClick?.(timelog);
      }}
      onMouseEnter={(e) => onHover(timelog, e.currentTarget)}
      onMouseLeave={onLeave}
      onFocus={(e) => onHover(timelog, e.currentTarget)}
      onBlur={onLeave}
      style={{
        height,
        top: offsetTop,
        backgroundColor: color,
      }}
      className={cn(
        "absolute left-[3px] right-[3px] overflow-hidden rounded-md ring-1 ring-foreground/5 transition-all focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        onClick &&
          "cursor-pointer hover:ring-foreground/15 hover:brightness-105",
      )}
    >
      {overtimeHeight > 0 && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-0 left-0 right-0 ${OVERTIME_SEGMENT_PATTERN}`}
          style={{ height: overtimeHeight }}
        />
      )}

      <div className="relative z-10 pointer-events-none flex h-full flex-col justify-center overflow-hidden px-2 py-1">
        <span className="truncate text-2xs font-semibold leading-tight text-foreground/80">
          {formatDuration(timelog.minutes)}
        </span>

        <span className="truncate text-2xs leading-tight text-foreground/80">
          {projectName} · {activityName}
        </span>
      </div>
    </div>
  );
};
