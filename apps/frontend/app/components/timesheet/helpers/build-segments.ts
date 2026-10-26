import { TimeLog } from "@/types";
import { Segment } from "../types";

export const MIN_SEGMENT_HEIGHT = 6;
export const SEGMENT_GAP_PX = 3;
export const STACK_TOP_INSET_PX = 3;

export function buildSegments(
  timelogs: TimeLog[],
  pixelsPerMinute: number,
): Segment[] {
  let offsetTop = STACK_TOP_INSET_PX;

  return timelogs.map((timelog) => {
    const height = Math.max(
      timelog.minutes * pixelsPerMinute,
      MIN_SEGMENT_HEIGHT,
    );
    const segment: Segment = { timelog, offsetTop, height };

    offsetTop += height + SEGMENT_GAP_PX;
    return segment;
  });
}
