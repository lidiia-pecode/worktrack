import { ClosedSpell } from "@/types";
import { CLOSED_DAY_TEXT } from "@/lib/utils/user";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * A day the viewer can't touch in a person's row: outside the team in view,
 * or after they left. It holds nothing, in the read-only tint a locked day
 * has, and says why on hover and to a screen reader.
 */
export const ClosedDayCell = ({
  reason,
}: {
  reason: ClosedSpell["reason"];
}) => (
  <td className="h-px border-r border-border/60 bg-muted/20 p-0 align-top">
    <Tooltip>
      <TooltipTrigger
        render={<div />}
        className="h-full min-h-10 w-full cursor-default"
      >
        <span className="sr-only">{CLOSED_DAY_TEXT[reason]}</span>
      </TooltipTrigger>
      <TooltipContent>{CLOSED_DAY_TEXT[reason]}</TooltipContent>
    </Tooltip>
  </td>
);
