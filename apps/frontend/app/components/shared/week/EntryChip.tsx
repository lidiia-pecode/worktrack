import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";
import { entryTint, getProjectColor } from "@/lib/utils/project-colors";

type EntryChipProps = Omit<
  HTMLAttributes<HTMLElement>,
  "onClick" | "className" | "style"
> & {
  projectName: string;
  /** Picks the project's colour. */
  colorSeed: string;
  minutes: number;
  /** A plan rather than logged time: dashed and lighter. */
  isPlan?: boolean;
  /** A plan on an archived project: grey and struck through. */
  isArchived?: boolean;
  /** In a narrow column: the colour and the hours, the project left to the label. */
  isCompact?: boolean;
  /** Makes the chip a button. */
  onClick?: () => void;
};

/**
 * One entry in a week grid, the same in Team time and Planning: the project,
 * then its hours. Logged time is solid in the project's colour; a plan is
 * dashed and lighter.
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
      ? {
          backgroundColor: `oklch(from ${color} l c h / 0.1)`,
          borderColor: `oklch(from ${color} l c h / 0.7)`,
        }
      : { backgroundColor: entryTint(color) };

  // The project at full strength: the surface behind the text is mixed down,
  // so the dot is what carries the colour.
  const mark = isArchived ? null : (
    <span
      aria-hidden
      className="size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );

  const className = cn(
    "flex h-5 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-2xs leading-none",
    isCompact && "justify-center",
    isPlan
      ? "border border-dashed text-muted-foreground"
      : "text-foreground ring-1 ring-foreground/5",
    isArchived && "border-border bg-muted/30 line-through",
    onClick &&
      "cursor-pointer transition-[filter,box-shadow] hover:brightness-95 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
    onClick && !isPlan && "hover:ring-foreground/15",
  );

  const content = isCompact ? (
    <>
      {mark}
      <span className="shrink-0 font-semibold tabular-nums">{duration}</span>
    </>
  ) : (
    <>
      {mark}
      <span className="min-w-0 flex-1 truncate">{projectName}</span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          isPlan ? "font-medium" : "font-semibold",
        )}
      >
        {duration}
      </span>
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
