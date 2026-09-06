import { formatDuration } from "@/lib/utils/date";
import { Segment } from "../types";
import { TimeLog } from "@/types";
import { getProjectColor } from "@/lib/utils/project-colors";
import { OVERTIME_SEGMENT_PATTERN } from "../consts";
import { getTimelogDisplay } from "../helpers/timelog-display";

type TimelogSegmentProps = {
  segment: Segment;
  onClick: (timelog: TimeLog) => void;
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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${formatDuration(timelog.minutes)} — ${projectName} / ${activityName}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(timelog);
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
      className="
        absolute
        left-[3px]
        right-[3px]
        rounded-md
        ring-1
        ring-black/5
        overflow-hidden
        hover:ring-black/15
        hover:brightness-105
        transition-all
      "
    >
      {overtimeHeight > 0 && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-0 left-0 right-0 ${OVERTIME_SEGMENT_PATTERN}`}
          style={{ height: overtimeHeight }}
        />
      )}

      <div className="relative z-10 pointer-events-none flex h-full flex-col justify-center overflow-hidden px-2 py-1">
        <span className="truncate text-[11px] font-semibold leading-tight text-zinc-900/80">
          {formatDuration(timelog.minutes)}
        </span>

        <span className="truncate text-[10px] leading-tight text-zinc-900/60">
          {projectName} · {activityName}
        </span>
      </div>
    </div>
  );
};
