import { formatDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export const HEADER_CELL_CLASS =
  "p-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground";

/** A duration, or a muted dash for none. */
export const Minutes = ({
  value,
  strong,
}: {
  value: number;
  strong?: boolean;
}) =>
  value > 0 ? (
    <span className={cn(strong && "font-semibold text-foreground")}>
      {formatDuration(value)}
    </span>
  ) : (
    <span className="text-muted-foreground/60">-</span>
  );
