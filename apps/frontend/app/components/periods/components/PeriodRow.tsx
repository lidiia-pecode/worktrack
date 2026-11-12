import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

import { StatusText } from "../../shared/StatusText";

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

// Open and Locked are how a month normally is, so they read as quiet text;
// a pill marks the months someone has to act on before they lock.
const ACTION_LABELS: Partial<Record<ReportingMonthState, string>> = {
  [ReportingMonthState.GRACE]: "Closing soon",
  [ReportingMonthState.REOPENED]: "Reopened",
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

/** Open and Locked as quiet text; a pill for a month someone has to act on. */
const PeriodStatus = ({ period }: { period: ReportingMonth }) =>
  ACTION_LABELS[period.state] ? (
    <Badge variant="warning" dot>
      {ACTION_LABELS[period.state]}
    </Badge>
  ) : period.state === ReportingMonthState.LOCKED ? (
    <StatusText>
      <Lock className="size-3.5" aria-hidden />
      Locked
    </StatusText>
  ) : (
    <StatusText tone="brand" dot>
      Open
    </StatusText>
  );

/** Reopen for a locked month, Close for a reopened one, nothing otherwise. */
const PeriodAction = ({
  period,
  monthLabel,
  onReopen,
  onClose,
}: Omit<PeriodRowProps, "timezone"> & { monthLabel: string }) => {
  if (period.state === ReportingMonthState.LOCKED) {
    return (
      <Button
        variant="outline"
        size="sm"
        aria-label={`Reopen ${monthLabel}`}
        onClick={() => onReopen(period.month)}
      >
        Reopen
      </Button>
    );
  }

  if (period.state === ReportingMonthState.REOPENED) {
    return (
      <Button
        variant="secondary"
        size="sm"
        aria-label={`Close ${monthLabel}`}
        onClick={() => onClose(period.month)}
      >
        Close
      </Button>
    );
  }

  return null;
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
        period.state === ReportingMonthState.REOPENED && "bg-warning-subtle",
      )}
    >
      <TableRowHeader
        className={cn("py-2", ROW_EDGE_START)}
        detail={describeState(period)}
      >
        {monthLabel}
      </TableRowHeader>

      <TableCell className="py-2">
        <PeriodStatus period={period} />
      </TableCell>

      <TableCell className="py-2 text-muted-foreground">
        <div className="truncate">{change ?? "—"}</div>
      </TableCell>

      <TableCell className={cn("py-2 text-right", ROW_EDGE_END)}>
        <PeriodAction
          period={period}
          monthLabel={monthLabel}
          onReopen={onReopen}
          onClose={onClose}
        />
      </TableCell>
    </TableRow>
  );
};

/**
 * A month on a phone, as the other Manage lists show a row there: the month
 * and its status, what that means, who changed it last, and its action.
 */
export const PeriodListItem = ({
  period,
  timezone,
  onReopen,
  onClose,
}: PeriodRowProps) => {
  const monthLabel = formatMonthLabel(period.month);
  const change = describeChange(period, timezone);

  return (
    <li
      className={cn(
        "flex items-center gap-3 py-3 pr-3 pl-4",
        period.state === ReportingMonthState.REOPENED && "bg-warning-subtle",
      )}
    >
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-foreground">{monthLabel}</span>
          <PeriodStatus period={period} />
        </div>
        <p className="text-xs text-muted-foreground">{describeState(period)}</p>
        {change && (
          <p className="text-xs text-muted-foreground">Changed by {change}</p>
        )}
      </div>

      <PeriodAction
        period={period}
        monthLabel={monthLabel}
        onReopen={onReopen}
        onClose={onClose}
      />
    </li>
  );
};
