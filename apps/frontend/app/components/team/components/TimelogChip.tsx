import { TimeLog } from "@/types";
import { formatDuration } from "@/lib/utils/date";
import { getTimelogDisplay } from "@/lib/utils/timelog";

import { EntryChip } from "../../shared/week/EntryChip";
import { timelogDetailsId } from "../../timesheet/components/TimelogPopover";

type TimelogChipProps = {
  timelog: TimeLog;
  /** Opens the entry; without it the block only shows its details. */
  onClick?: (timelog: TimeLog) => void;
  onHover: (timelog: TimeLog, target: HTMLElement) => void;
  onLeave: () => void;
  /** In a weekend's narrow column: the colour and the hours only. */
  isCompact?: boolean;
};

/** One entry in a Team time cell, with its details on hover or focus. */
export const TimelogChip = ({
  timelog,
  onClick,
  onHover,
  onLeave,
  isCompact,
}: TimelogChipProps) => {
  const { colorSeed, projectName } = getTimelogDisplay(timelog);
  const name = `${projectName} ${formatDuration(timelog.minutes)}`;

  return (
    <EntryChip
      projectName={projectName}
      colorSeed={colorSeed}
      minutes={timelog.minutes}
      isCompact={isCompact}
      onClick={onClick && (() => onClick(timelog))}
      aria-label={onClick ? `${name}, edit this entry` : name}
      aria-describedby={timelogDetailsId(timelog)}
      // Not a button when read-only, but still reachable, so its details
      // show by keyboard too.
      role={onClick ? undefined : "group"}
      tabIndex={onClick ? undefined : 0}
      onMouseEnter={(event) => onHover(timelog, event.currentTarget)}
      onMouseLeave={onLeave}
      onFocus={(event) => onHover(timelog, event.currentTarget)}
      onBlur={onLeave}
    />
  );
};
