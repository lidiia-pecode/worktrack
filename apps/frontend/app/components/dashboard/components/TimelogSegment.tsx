import { formatDuration } from "@/lib/date";
import { Segment } from "../types";
import { Timelog } from "@/types";
import { getProjectColor } from "@/lib/projectColors";
import { OVERTIME_SEGMENT_PATTERN } from "../consts";

type TimelogSegmentProps = {
  segment: Segment;
  onClick: (timelog: Timelog) => void;
  onHover: (timelog: Timelog, target: HTMLElement) => void;
  onLeave: () => void;
};

export const TimelogSegment = ({
  segment,
  onClick,
  onHover,
  onLeave,
}: TimelogSegmentProps) => {
  const { timelog, offsetTop, height, overtimeHeight } = segment;
  const color = getProjectColor(timelog.projectActivity.project.id);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${formatDuration(timelog.time)} — ${timelog.projectActivity.project.name} / ${timelog.projectActivity.activity.name}`}
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
      {/* hetching (overtime) */}
      {overtimeHeight > 0 && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-0 left-0 right-0 ${OVERTIME_SEGMENT_PATTERN}`}
          style={{ height: overtimeHeight }}
        />
      )}

      {/* timelog title */}
      <div className="relative z-10 pointer-events-none flex h-full flex-col justify-center overflow-hidden px-2 py-1">
        <span className="truncate text-[11px] font-semibold leading-tight text-zinc-900/80">
          {formatDuration(timelog.time)}
        </span>

        <span className="truncate text-[10px] leading-tight text-zinc-900/60">
          {timelog.projectActivity.project.name} ·{" "}
          {timelog.projectActivity.activity.name}
        </span>
      </div>
    </div>
  );
};
