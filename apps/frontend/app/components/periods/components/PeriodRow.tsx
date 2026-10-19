import { Lock } from "lucide-react";

import { Badge, BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow, TableRowHeader } from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import {
  formatDayMonthLabel,
  formatDayMonthYearLabel,
  formatMonthLabel,
  isoDateInTimeZone,
} from "@/lib/utils/date";
import { ReportingMonth } from "@/types";
import { ReportingMonthState } from "@/types/enums";

/** The same inset at both edges of the header and every row. */
export const ROW_EDGE_START = "pl-5";
export const ROW_EDGE_END = "pr-5";

type PeriodRowProps = {
  period: ReportingMonth;
  /** The company's time zone, for the day a change was made on. */
  timezone?: string;
  onReopen: (month: string) => void;
  onClose: (month: string) => void;
};

// Locked is the rule, so it gets the lock icon and no badge; a badge marks the
// exceptions.
const STATE_BADGE: Record<
  Exclude<ReportingMonthState, ReportingMonthState.LOCKED>,
  { label: string; variant: BadgeProps["variant"] }
> = {
  [ReportingMonthState.OPEN]: { label: "Open", variant: "default" },
  [ReportingMonthState.GRACE]: { label: "Closing soon", variant: "warning" },
  [ReportingMonthState.REOPENED]: { label: "Reopened", variant: "warning" },
};

const describeState = ({ state, editableUntil }: ReportingMonth): string => {
  switch (state) {
    case ReportingMonthState.OPEN:
      return "Current month";
    case ReportingMonthState.GRACE:
      return `Still editable until ${formatDayMonthLabel(editableUntil!)}, then it locks`;
    case ReportingMonthState.LOCKED:
      return "Time, absences and plans are read-only";
    case ReportingMonthState.REOPENED:
      return "Open for corrections until you close it";
  }
};

// The day alone when the person's account is gone.
const describeChange = (
  { changedBy, changedAt }: ReportingMonth,
  timezone?: string,
): string | null => {
  if (!changedAt) return null;

  const day = formatDayMonthYearLabel(
    isoDateInTimeZone(new Date(changedAt), timezone),
  );

  return changedBy ? `${changedBy} · ${day}` : day;
};

export const PeriodRow = ({
  period,
  timezone,
  onReopen,
  onClose,
}: PeriodRowProps) => {
  const monthLabel = formatMonthLabel(period.month);
  const change = describeChange(period, timezone);

  return (
    <TableRow
      className={cn(
        "h-14",
        period.state === ReportingMonthState.REOPENED && "bg-warning/5",
      )}
    >
      <TableRowHeader
        className={cn("py-2", ROW_EDGE_START)}
        detail={describeState(period)}
      >
        {monthLabel}
      </TableRowHeader>

      <TableCell className="py-2">
        {period.state === ReportingMonthState.LOCKED ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            Locked
          </span>
        ) : (
          <Badge variant={STATE_BADGE[period.state].variant} dot>
            {STATE_BADGE[period.state].label}
          </Badge>
        )}
      </TableCell>

      <TableCell className="py-2 text-muted-foreground">
        <div className="truncate">{change ?? "—"}</div>
      </TableCell>

      <TableCell className={cn("py-2 text-right", ROW_EDGE_END)}>
        {period.state === ReportingMonthState.LOCKED && (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Reopen ${monthLabel}`}
            onClick={() => onReopen(period.month)}
          >
            Reopen
          </Button>
        )}

        {period.state === ReportingMonthState.REOPENED && (
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Close ${monthLabel}`}
            onClick={() => onClose(period.month)}
          >
            Close
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};
