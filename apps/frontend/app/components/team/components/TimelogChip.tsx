import { TimeLog } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import { getProjectColor } from "@/lib/utils/project-colors";
import { getTimelogDisplay } from "@/lib/utils/timelog";

import { timelogDetailsId } from "../../timesheet/components/TimelogPopover";

type TimelogChipProps = {
  timelog: TimeLog;
  /** Opens the entry; without it the block only shows its details. */
  onClick?: (timelog: TimeLog) => void;
  onHover: (timelog: TimeLog, target: HTMLElement) => void;
  onLeave: () => void;
};

/** One entry in a Team time cell: its duration and project on the project's colour. */
export const TimelogChip = ({
  timelog,
  onClick,
  onHover,
  onLeave,
}: TimelogChipProps) => {
  const { colorSeed, projectName } = getTimelogDisplay(timelog);
  const color = getProjectColor(colorSeed);
  const duration = formatDuration(timelog.minutes);

  const props = {
    "aria-describedby": timelogDetailsId(timelog),
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) =>
      onHover(timelog, event.currentTarget),
    onMouseLeave: onLeave,
    onFocus: (event: React.FocusEvent<HTMLElement>) =>
      onHover(timelog, event.currentTarget),
    onBlur: onLeave,
    // The project colour is translucent, so it sits on the card colour: a
    // block looks the same over a weekend's stripes or a day's excess.
    style: {
      backgroundColor: "var(--card)",
      backgroundImage: `linear-gradient(${color}, ${color})`,
    },
    className: cn(
      "flex h-5 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-2xs leading-none text-foreground ring-1 ring-foreground/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
      onClick &&
        "cursor-pointer transition-[filter,box-shadow] hover:ring-foreground/15 hover:brightness-105",
    ),
  };

  const content = (
    <>
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `oklch(from ${color} l c h)` }}
      />
      <span className="shrink-0 font-semibold tabular-nums">{duration}</span>
      <span className="truncate">{projectName}</span>
    </>
  );

  if (!onClick) {
    // Not a button, but still reachable, so its details show by keyboard too.
    return (
      <span
        role="group"
        tabIndex={0}
        aria-label={`${duration} ${projectName}`}
        {...props}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${duration} ${projectName}, edit this entry`}
      onClick={() => onClick(timelog)}
      {...props}
    >
      {content}
    </button>
  );
};
