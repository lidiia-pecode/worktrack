"use client";

import { StickyNote } from "lucide-react";

import { TimeLog } from "@/types";
import { formatDuration } from "@/lib/utils/date";
import { getProjectColor } from "@/lib/utils/project-colors";
import { getTimelogDisplay } from "@/lib/utils/timelog";

type UserTimeEntryRowProps = {
  timelog: TimeLog;
  onEdit?: (timelog: TimeLog) => void;
};

export const UserTimeEntryRow = ({
  timelog,
  onEdit,
}: UserTimeEntryRowProps) => {
  const { colorSeed, projectName, activityName } = getTimelogDisplay(timelog);

  const content = (
    <>
      <span
        aria-hidden
        className="mt-1.5 size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: getProjectColor(colorSeed) }}
      />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="truncate text-sm font-medium text-foreground">
            {projectName}
          </span>

          <span className="truncate text-xs text-muted-foreground">
            {activityName}
          </span>

          {!timelog.isBillable && (
            <span className="rounded bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Non-billable
            </span>
          )}
        </span>

        {timelog.note && (
          <span className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <StickyNote className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-2">{timelog.note}</span>
          </span>
        )}
      </span>

      <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
        {formatDuration(timelog.minutes)}
      </span>
    </>
  );

  if (!onEdit) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onEdit(timelog)}
      className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {content}
    </button>
  );
};
