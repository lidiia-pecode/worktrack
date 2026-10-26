"use client";

import { Lock } from "lucide-react";

import { formatDayMonthLabel, formatMonthLabel } from "@/lib/utils/date";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type GraceMonthNoteProps = {
  /** YYYY-MM. */
  month: string;
  editableUntil: string;
};

/** In a month's grace week, a lock that says until when last month is open. */
export const GraceMonthNote = ({
  month,
  editableUntil,
}: GraceMonthNoteProps) => {
  const note = `${formatMonthLabel(month)} can still be edited until ${formatDayMonthLabel(editableUntil)}.`;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
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
