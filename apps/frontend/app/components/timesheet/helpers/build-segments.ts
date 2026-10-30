import { Segment } from "../types";

// One line of `text-2xs` with the block's padding, so the shortest entry still reads.
export const MIN_SEGMENT_HEIGHT = 22;
/** From this height a block has room for its second line. */
export const TWO_LINE_MIN_HEIGHT = 36;
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

/**
 * Where a stack reaches `minutes`: inside the entry that crosses it, or past
 * the last one on the same scale, so a line drawn there meets the entries.
 */
export function offsetAtMinutes<T>(
  segments: Segment<T>[],
  minutesOf: (item: T) => number,
  minutes: number,
  pixelsPerMinute: number,
): number {
  let before = 0;

  for (const segment of segments) {
    const itemMinutes = minutesOf(segment.item);
    if (itemMinutes > 0 && minutes <= before + itemMinutes) {
      return (
        segment.offsetTop + ((minutes - before) / itemMinutes) * segment.height
      );
    }
    before += itemMinutes;
  }

  const last = segments.at(-1);
  const stackEnd = last ? last.offsetTop + last.height : STACK_TOP_INSET_PX;
  return stackEnd + (minutes - before) * pixelsPerMinute;
}

/**
 * How far down a day's drawing reaches: the end of its stack, gaps and minimum
 * heights included, or its target line when that falls lower.
 */
export function dayDrawingHeight<T>(
  items: T[],
  minutesOf: (item: T) => number,
  targetMinutes: number,
  pixelsPerMinute: number,
): number {
  const segments = stackSegments(items, minutesOf, pixelsPerMinute);
  const last = segments.at(-1);
  const stackEnd = last ? last.offsetTop + last.height : 0;

  return targetMinutes > 0
    ? Math.max(
        stackEnd,
        offsetAtMinutes(segments, minutesOf, targetMinutes, pixelsPerMinute),
      )
    : stackEnd;
}
