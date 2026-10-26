"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Clock, StickyNote, Tag } from "lucide-react";

import { TimeLog } from "@/types";
import { formatDuration } from "@/lib/utils/date";
import { getProjectColor } from "@/lib/utils/project-colors";
import { getTimelogDisplay } from "@/lib/utils/timelog";

const DAY_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const POPOVER_WIDTH = 240;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;

/** What every entry names in `aria-describedby`; the card exists only while shown. */
export const timelogDetailsId = (timelog: TimeLog) =>
  `timelog-details-${timelog.id}`;

type Props = {
  timelog: TimeLog;
  anchor: HTMLElement;
};

/** Where the entry is now; it moves when the page scrolls under it. */
const useAnchorRect = (anchor: HTMLElement) => {
  const [rect, setRect] = useState(() => anchor.getBoundingClientRect());

  useEffect(() => {
    const measure = () => setRect(anchor.getBoundingClientRect());
    // The card stays mounted while the pointer moves to another entry.
    measure();

    // Capture, so a scroll inside the page's own container counts too.
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [anchor]);

  return rect;
};

export const TimelogPopover = ({ timelog, anchor }: Props) => {
  const rect = useAnchorRect(anchor);
  const style = (() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - POPOVER_WIDTH / 2, VIEWPORT_MARGIN),
      viewportWidth - POPOVER_WIDTH - VIEWPORT_MARGIN,
    );

    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    const openUpward = spaceAbove > spaceBelow;

    return {
      left,
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + ANCHOR_GAP }
        : { top: rect.bottom + ANCHOR_GAP }),
    };
  })();

  const { colorSeed, projectName, activityName } = getTimelogDisplay(timelog);
  const color = getProjectColor(colorSeed);

  return createPortal(
    <div
      id={timelogDetailsId(timelog)}
      role="tooltip"
      className="pointer-events-none fixed z-50 w-60 rounded-xl border border-border bg-popover p-3 shadow-lg animate-in fade-in zoom-in-95 duration-100"
      style={style}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="truncate text-sm font-semibold text-popover-foreground">
          {projectName}
        </p>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Tag className="size-3.5 shrink-0" />
          <span className="truncate">{activityName}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" />
          <span>{formatDuration(timelog.minutes)}</span>
          {!timelog.isBillable && (
            <span className="ml-1 rounded bg-muted/40 px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
              Non-billable
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0" />
          <span>{DAY_LABEL.format(new Date(`${timelog.date}T00:00:00`))}</span>
        </div>

        {timelog.note && (
          <div className="mt-1.5 flex items-start gap-1.5 border-t border-border/60 pt-1.5">
            <StickyNote className="size-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-3 text-foreground/80">
              {timelog.note}
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
