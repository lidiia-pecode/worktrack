import { Button } from "@/components/ui/button";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatDayMonthLabel, formatMonthLabel } from "@/lib/utils/date";
import { ReportingMonth } from "@/types";
import { ReportingMonthState } from "@/types/enums";

type PeriodRowProps = {
  period: ReportingMonth;
  onReopen: (month: string) => void;
  onClose: (month: string) => void;
  isClosing: boolean;
};

const STATE_BADGE: Record<
  ReportingMonthState,
  { label: string; variant: BadgeProps["variant"] }
> = {
  [ReportingMonthState.OPEN]: { label: "Open", variant: "default" },
  [ReportingMonthState.GRACE]: { label: "Closing soon", variant: "warning" },
  [ReportingMonthState.LOCKED]: { label: "Locked", variant: "neutral" },
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

export const PeriodRow = ({
  period,
  onReopen,
  onClose,
  isClosing,
}: PeriodRowProps) => {
  const badge = STATE_BADGE[period.state];

  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-5 py-4",
        period.state === ReportingMonthState.REOPENED && "bg-warning/5",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-card-foreground">
          {formatMonthLabel(period.month)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {describeState(period)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={badge.variant} dot>
          {badge.label}
        </Badge>

        {period.state === ReportingMonthState.LOCKED && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReopen(period.month)}
          >
            Reopen
          </Button>
        )}

        {period.state === ReportingMonthState.REOPENED && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onClose(period.month)}
            isLoading={isClosing}
          >
            Close
          </Button>
        )}
      </div>
    </li>
  );
};
