"use client";

import { Lock } from "lucide-react";

import { useGraceMonth } from "@/hooks/useReportingPeriods";
import { formatDayMonthLabel, formatMonthLabel } from "@/lib/utils/date";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * In a month's grace week, an amber lock that says until when last month can
 * still be edited, on hover or a tap. Amber, as someone has to act before it
 * locks; nothing shows outside the grace week.
 */
export const GraceMonthNote = () => {
  const graceMonth = useGraceMonth();
  if (!graceMonth?.editableUntil) return null;

  const note = `${formatMonthLabel(graceMonth.month)} can still be edited until ${formatDayMonthLabel(graceMonth.editableUntil)}.`;

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        render={
          <Button
            variant="warning"
            size="iconSm"
            aria-label={note}
            className="max-sm:size-10"
          />
        }
      >
        <Lock className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="max-w-64 p-3 text-sm">
        {note}
      </PopoverContent>
    </Popover>
  );
};
