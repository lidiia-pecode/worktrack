import { Segment } from "../types";

export const MIN_SEGMENT_HEIGHT = 6;
export const SEGMENT_GAP_PX = 3;
export const STACK_TOP_INSET_PX = 3;

/** Stacks a day's entries or plans from the top, each as tall as its minutes. */
export function stackSegments<T>(
  items: T[],
  minutesOf: (item: T) => number,
  pixelsPerMinute: number,
): Segment<T>[] {
  let offsetTop = STACK_TOP_INSET_PX;

  return items.map((item) => {
    const height = Math.max(
      minutesOf(item) * pixelsPerMinute,
      MIN_SEGMENT_HEIGHT,
    );
    const segment = { item, offsetTop, height };

    offsetTop += height + SEGMENT_GAP_PX;
    return segment;
  });
}
