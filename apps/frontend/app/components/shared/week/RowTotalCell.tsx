import { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/date";

type RowTotalCellProps = {
  minutes: number;
  isOver: boolean;
  /** What the figure is measured against, "of 40h" or "on Acme"; left out when nothing is. */
  expectation?: string;
  /** The bar and any note under the figure. */
  children?: ReactNode;
  /** How the figure reads; hours and minutes unless a month wants decimals. */
  formatHours?: (minutes: number) => string;
};

/** A person's week in the week grids' right column: the figure, then its bar. */
export const RowTotalCell = ({
  minutes,
  isOver,
  expectation,
  children,
  formatHours = formatDuration,
}: RowTotalCellProps) => (
  <td className="p-3 align-top">
    <div className="flex flex-col items-end gap-1.5">
      <span className="text-right text-xs">
        <span
          className={cn(
            "text-sm font-semibold whitespace-nowrap",
            isOver ? "text-warning-text" : "text-foreground",
          )}
        >
          {formatHours(minutes)}
        </span>

        {/* A long week breaks between the figures, never inside one. */}
        {expectation && (
          <>
            {" "}
            <span className="whitespace-nowrap text-muted-foreground">
              {expectation}
            </span>
          </>
        )}
      </span>

      {children}
    </div>
  </td>
);
