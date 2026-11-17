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

import { Button } from "@/components/ui/button";

import { PERSON_ACTION, PersonLabel } from "../../shared/PersonLabel";
import { STICKY_PERSON_CELL } from "../../shared/week/sticky-column";

type PlanningPersonCellProps = {
  row: PlanningRow;
  /** Every day in view is in a locked month, so nothing can be planned. */
  isPeriodLocked: boolean;
  onPlanPeriod: (row: PlanningRow) => void;
};

/** Has no working hours to plan; listed only for plans left from before. */
export const hasNoFixedHours = (row: PlanningRow) =>
  row.dayLimits.every((day) => day.minutes === 0);

/**
 * A Planning row's person, with Plan a period beside them when they can be
 * planned in the week or month shown.
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

  const canPlan = isActive && !noFixedHours && !isPeriodLocked;

  return (
    <th
      scope="row"
      className={cn(
        STICKY_PERSON_CELL,
        "group/person p-0 text-left align-top font-normal",
      )}
    >
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

        {canPlan && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onPlanPeriod(row)}
            aria-label={`Plan a period for ${fullName(row.user)}`}
            className={cn(
              PERSON_ACTION,
              "gap-0.5 px-2 text-xs font-medium text-brand hover:text-brand",
            )}
          >
            Plan period
            <ChevronRight className="size-3.5" />
          </Button>
        )}
      </div>
    </th>
  );
};
