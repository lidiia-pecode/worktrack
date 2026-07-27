"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Clock, StickyNote, Tag } from "lucide-react";

import { Timelog } from "@/types";
import { formatDuration } from "@/lib/date";
import { getProjectColor } from "@/lib/projectColors";

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const POPOVER_WIDTH = 240;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;

type Props = {
  timelog: Timelog;
  anchor: DOMRect;
};

export const TimelogPopover = ({ timelog, anchor }: Props) => {
  const style = useMemo(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const left = Math.min(
      Math.max(
        anchor.left + anchor.width / 2 - POPOVER_WIDTH / 2,
        VIEWPORT_MARGIN,
      ),
      viewportWidth - POPOVER_WIDTH - VIEWPORT_MARGIN,
    );

    const spaceAbove = anchor.top;
    const spaceBelow = viewportHeight - anchor.bottom;
    const openUpward = spaceAbove > spaceBelow;

    return {
      left,
      ...(openUpward
        ? { bottom: viewportHeight - anchor.top + ANCHOR_GAP }
        : { top: anchor.bottom + ANCHOR_GAP }),
    };
  }, [anchor]);

  const color = getProjectColor(timelog.projectActivity.project.id);

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-60 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg animate-in fade-in zoom-in-95 duration-100"
      style={style}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className={`truncate text-sm font-semibold text-zinc-900`}>
          {timelog.projectActivity.project.name}
        </p>
      </div>

      <div className="space-y-1.5 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <Tag className="size-3.5 shrink-0" />
          <span className="truncate">
            {timelog.projectActivity.activity.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" />
          <span>{formatDuration(timelog.time)}</span>
          {!timelog.isBillable && (
            <span className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
              Non-billable
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0" />
          <span>{DAY_LABEL.format(new Date(`${timelog.date}T00:00:00`))}</span>
        </div>

        {timelog.note && (
          <div className="mt-1.5 flex items-start gap-1.5 border-t border-zinc-100 pt-1.5">
            <StickyNote className="size-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-3 text-zinc-600">{timelog.note}</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
