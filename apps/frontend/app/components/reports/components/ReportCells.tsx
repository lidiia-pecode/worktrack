import { formatDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export const HEADER_CELL_CLASS =
  "p-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground";

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

/** A share as a whole percentage, or "—" when there was nothing to measure. */
export const Percent = ({ value }: { value: number | null }) =>
  value === null ? (
    <span className="text-muted-foreground/60">—</span>
  ) : (
    <span className="font-medium text-foreground">
      {Math.round(value * 100)}%
    </span>
  );
