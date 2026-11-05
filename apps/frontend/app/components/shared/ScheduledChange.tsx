import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { formatDayMonthYearLabel } from "@/lib/utils/date";

interface ScheduledChangeProps {
  validFrom: string;
  /** The value from that day. */
  children: ReactNode;
  cancel?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    /** Why it is disabled. */
    title?: string;
  };
}

/** A change that starts after today, with a way to cancel it. */
export const ScheduledChange = ({
  validFrom,
  children,
  cancel,
}: ScheduledChangeProps) => (
  <div className="grid gap-0.5 rounded-md border border-border px-3 py-2">
    <div className="flex min-h-6 items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">
        From {formatDayMonthYearLabel(validFrom)}
      </span>
      {cancel && (
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={cancel.onClick}
          disabled={cancel.disabled}
          title={cancel.title}
          aria-label={cancel.label}
        >
          Cancel
        </Button>
      )}
    </div>
    <span>{children}</span>
  </div>
);
