import { Timelog } from "@/types";
import { Segment } from "../types";

export const MIN_SEGMENT_HEIGHT = 6;
export const SEGMENT_GAP_PX = 3;
export const STACK_TOP_INSET_PX = 3;

export function buildSegments(
  timelogs: Timelog[],
  plannedMinutes: number,
  pixelsPerMinute: number,
): Segment[] {
  let cumulativeMinutes = 0;
  let offsetTop = STACK_TOP_INSET_PX;

  return timelogs.map((timelog) => {
    const startMinutes = cumulativeMinutes;
    const endMinutes = cumulativeMinutes + timelog.time;
    const height = Math.max(timelog.time * pixelsPerMinute, MIN_SEGMENT_HEIGHT);

    let overtimeHeight = 0;

    if (startMinutes >= plannedMinutes) {
      overtimeHeight = height;
    } else if (endMinutes > plannedMinutes) {
      overtimeHeight = height * ((endMinutes - plannedMinutes) / timelog.time);
    }

    const segment: Segment = {
      timelog,
      offsetTop,
      height,
      overtimeHeight,
    };

    offsetTop += height + SEGMENT_GAP_PX;
    cumulativeMinutes = endMinutes;
    return segment;
  });
}
