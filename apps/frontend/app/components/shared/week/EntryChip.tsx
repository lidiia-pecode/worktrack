import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import {
  entryTint,
  getProjectColor,
  planSurface,
} from "@/lib/utils/project-colors";

type EntryChipProps = Omit<
  HTMLAttributes<HTMLElement>,
  "onClick" | "className" | "style"
> & {
  projectName: string;
  /** Picks the project's colour. */
  colorSeed: string;
  minutes: number;
  /** A plan rather than logged time: a lighter tint, with no dot. */
  isPlan?: boolean;
  /** A plan on an archived project: grey and struck through. */
  isArchived?: boolean;
  /** In a narrow column: the colour and the hours, the project left to the label. */
  isCompact?: boolean;
  /** Makes the chip a button. */
  onClick?: () => void;
};

/**
 * One entry in a week grid, the same in Team time and Planning: its hours,
 * then the project. Logged time is a strong tint of the project's colour with
 * its dot; a plan a light one with no dot.
 */
export const EntryChip = ({
  projectName,
  colorSeed,
  minutes,
  isPlan = false,
  isArchived = false,
  isCompact = false,
  onClick,
  ...props
}: EntryChipProps) => {
  const color = getProjectColor(colorSeed);
  const duration = formatDuration(minutes);

  const style = isArchived
    ? undefined
    : isPlan
      ? planSurface(color)
      : { backgroundColor: entryTint(color) };

  // The project at full strength, on logged time only: a plan's lighter
  // tint already says it is intended rather than done.
  const mark =
    isArchived || isPlan ? null : (
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
    );

  const className = cn(
    "flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md px-2 text-left text-xs leading-none",
    isCompact && "justify-center",
    isPlan
      ? "text-muted-foreground"
      : "text-foreground ring-1 ring-foreground/5",
    isArchived && "bg-muted/30 line-through",
    onClick &&
      "cursor-pointer transition-[filter,box-shadow] hover:brightness-95 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
    onClick && !isPlan && "hover:ring-foreground/15",
  );

  const content = isCompact ? (
    <>
      {mark}
      <span className="shrink-0 font-semibold">{duration}</span>
    </>
  ) : (
    <>
      {mark}
      {/* Hours first, so they stay in one place whatever the name's length. */}
      <span
        className={cn("shrink-0", isPlan ? "font-medium" : "font-semibold")}
      >
        {duration}
      </span>
      <span className="min-w-0 truncate">{projectName}</span>
    </>
  );

  if (!onClick) {
    return (
      <span className={className} style={style} {...props}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={style}
      {...props}
    >
      {content}
    </button>
  );
};
