"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import {
  changeLabel,
  changeTipLines,
  FigureChange,
} from "@/lib/utils/report-overview";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ChangeTipProps = {
  change: FigureChange;
  /** The period compared with, as the caption names it: "September 2026". */
  previousName: string;
  /** What the figure counts, for "Nothing logged in …": logged by default. */
  subject?: string;
};

/** The arrows of Team time's sort buttons: up, down, and both for no change. */
const Direction = ({ points }: { points: number }) => {
  const iconClass = "size-3 shrink-0";
  if (points > 0) return <ArrowUp className={iconClass} aria-hidden />;
  if (points < 0) return <ArrowDown className={iconClass} aria-hidden />;
  return <ArrowUpDown className={iconClass} aria-hidden />;
};

/**
 * "↑ 4 pts", dotted like an abbreviation since it opens a tip on hover and
 * keyboard focus, saying what the points are and the hours behind them. The
 * colour stays muted: the arrow tells the direction, not good or bad.
 */
export const ChangeTip = ({
  change,
  previousName,
  subject,
}: ChangeTipProps) => {
  const lines = changeTipLines(change, previousName, subject);

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} />}
        aria-label={lines.join(". ")}
        className="inline-flex cursor-default items-center gap-0.5 rounded-sm whitespace-nowrap underline decoration-muted-foreground/50 decoration-dotted underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Direction points={change.points} />
        {changeLabel(change)}
      </TooltipTrigger>
      <TooltipContent>
        {lines.map((line) => (
          <span key={line} className="block first:font-medium">
            {line}
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  );
};
