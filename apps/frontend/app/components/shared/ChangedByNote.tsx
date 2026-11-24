import { UserPen } from "lucide-react";

import { Absence, TimeLog } from "@/types";
import { changedByText } from "@/lib/utils/user";
import { cn } from "@/lib/utils/cn";

type ChangedByNoteProps = {
  record: TimeLog | Absence;
  className?: string;
};

/** In a record's form or read-only view: who else added or last changed it. */
export const ChangedByNote = ({ record, className }: ChangedByNoteProps) => {
  const text = changedByText(record);
  if (!text) return null;

  return (
    <p className={cn("flex gap-2 text-sm text-muted-foreground", className)}>
      <UserPen className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
};
