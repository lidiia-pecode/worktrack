import { formatDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { Gap } from "@/lib/utils/report-table";

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
    <span className="text-muted-foreground">-</span>
  );

/**
 * Billable time with its share of what was logged, beside a bar in the
 * timesheet week bar's two shades.
 */
export const BillableSplit = ({
  billableMinutes,
  totalMinutes,
}: {
  billableMinutes: number;
  totalMinutes: number;
}) => {
  if (totalMinutes === 0) return <Minutes value={0} />;

  const share = Math.round((billableMinutes / totalMinutes) * 100);

  return (
    <span className="flex items-center justify-end gap-2">
      <span className="tabular-nums">
        {billableMinutes > 0 && <Minutes value={billableMinutes} />}
        <span className="ml-1 text-xs text-muted-foreground">{share}%</span>
      </span>
      <span
        className="flex h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-brand/25"
        aria-hidden
      >
        <span className="bg-brand/70" style={{ width: `${share}%` }} />
      </span>
    </span>
  );
};

/** A gap in words; a dot in the brand tone, never red or green, marks a large one. */
export const GapLabel = ({ gap }: { gap: Gap }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 text-sm whitespace-nowrap",
      gap.isNotable ? "text-foreground" : "text-muted-foreground",
    )}
  >
    {gap.isNotable && (
      <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
    )}
    {gap.label}
  </span>
);

export const Days = ({ value }: { value: number }) =>
  value > 0 ? (
    <span>
      {value} {value === 1 ? "day" : "days"}
    </span>
  ) : (
    <span className="text-muted-foreground">-</span>
  );
