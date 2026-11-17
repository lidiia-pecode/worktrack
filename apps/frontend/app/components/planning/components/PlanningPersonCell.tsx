import { ChevronRight } from "lucide-react";

import { PlanningRow } from "@/types";
import { UserStatus } from "@/types/enums";
import { cn } from "@/lib/utils/cn";
import {
  NO_FIXED_HOURS,
  fullName,
  leaverLabel,
  moveLabel,
} from "@/lib/utils/user";
import { factsLine } from "@/lib/utils/text";

import { PersonLabel } from "../../shared/PersonLabel";
import { STICKY_PERSON_CELL } from "../../shared/week/sticky-column";

type PlanningPersonCellProps = {
  row: PlanningRow;
  /** Every day in view is in a locked month, so nothing can be planned. */
  isPeriodLocked: boolean;
  onPlanPeriod: (row: PlanningRow) => void;
};

/** Listed at 0h only for plans left from before, which can be deleted day by day. */
export const hasNoFixedHours = (row: PlanningRow) =>
  row.dayLimits.every((day) => day.minutes === 0);

/**
 * A Planning row's person, which opens Plan a period for them when they can
 * be planned in the week or month shown.
 */
export const PlanningPersonCell = ({
  row,
  isPeriodLocked,
  onPlanPeriod,
}: PlanningPersonCellProps) => {
  const isActive = row.user.status === UserStatus.ACTIVE;
  // Someone who moved out of the team in view is planned too: a period skips
  // and lists the days in the other team.
  const noFixedHours = hasNoFixedHours(row);
  const facts = factsLine([
    ...row.moves.map(moveLabel),
    leaverLabel(row.user),
    isActive && noFixedHours && NO_FIXED_HOURS,
  ]);

  return (
    <th
      scope="row"
      className={cn(STICKY_PERSON_CELL, "p-0 text-left font-normal")}
    >
      {isActive && !noFixedHours && !isPeriodLocked ? (
        <button
          type="button"
          onClick={() => onPlanPeriod(row)}
          aria-label={`Plan a period for ${fullName(row.user)}`}
          className="group flex w-full min-w-0 cursor-pointer items-start gap-2.5 py-2 pr-1.5 pl-2.5 text-left transition hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <PersonLabel user={row.user}>{facts}</PersonLabel>

          {/* Says what the cell does once it is hovered or focused; it
              takes no room until then, so the name keeps its width. */}
          <span
            aria-hidden
            className="ml-auto hidden shrink-0 items-center gap-0.5 text-xs font-medium text-brand group-hover:flex group-focus-visible:flex"
          >
            Plan period
            <ChevronRight className="size-3.5" />
          </span>
        </button>
      ) : (
        <div className="flex min-w-0 items-start gap-2.5 py-2 pr-1.5 pl-2.5">
          <PersonLabel user={row.user}>
            {facts && (
              <span
                title={
                  isActive && noFixedHours
                    ? `Give ${row.user.firstName} working hours to plan them.`
                    : undefined
                }
              >
                {facts}
              </span>
            )}
          </PersonLabel>
        </div>
      )}
    </th>
  );
};
