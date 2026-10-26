import { describe, expect, it } from "vitest";

import {
  MIN_SEGMENT_HEIGHT,
  SEGMENT_GAP_PX,
  STACK_TOP_INSET_PX,
  dayDrawingHeight,
  offsetAtMinutes,
  stackSegments,
} from "./build-segments";

const minutesOf = (minutes: number) => minutes;

describe("offsetAtMinutes", () => {
  it("lands inside the entry that crosses the figure", () => {
    const segments = stackSegments([60, 60], minutesOf, 1);

    expect(offsetAtMinutes(segments, minutesOf, 90, 1)).toBe(
      STACK_TOP_INSET_PX + 60 + SEGMENT_GAP_PX + 30,
    );
  });

  it("follows a short entry drawn taller than its minutes", () => {
    const segments = stackSegments([2, 60], minutesOf, 1);

    // The 2-minute entry is drawn at the minimum height, so it ends lower.
    expect(offsetAtMinutes(segments, minutesOf, 2, 1)).toBe(
      STACK_TOP_INSET_PX + MIN_SEGMENT_HEIGHT,
    );
  });

  it("carries on past the last entry on the same scale", () => {
    const segments = stackSegments([60], minutesOf, 1);

    expect(offsetAtMinutes(segments, minutesOf, 100, 1)).toBe(
      STACK_TOP_INSET_PX + 100,
    );
    expect(offsetAtMinutes([], minutesOf, 100, 1)).toBe(
      STACK_TOP_INSET_PX + 100,
    );
  });
});

describe("dayDrawingHeight", () => {
  it("counts the inset, every gap and the minimum heights", () => {
    expect(dayDrawingHeight([60, 2, 60], minutesOf, 0, 1)).toBe(
      STACK_TOP_INSET_PX +
        60 +
        SEGMENT_GAP_PX +
        MIN_SEGMENT_HEIGHT +
        SEGMENT_GAP_PX +
        60,
    );
    expect(dayDrawingHeight([], minutesOf, 0, 1)).toBe(0);
  });

  it("reaches the target line when it falls below many short entries", () => {
    const tenShort = Array<number>(10).fill(2);
    const stackEnd =
      STACK_TOP_INSET_PX + 10 * MIN_SEGMENT_HEIGHT + 9 * SEGMENT_GAP_PX;

    // 20 minutes logged, 460 to go below the stack.
    expect(dayDrawingHeight(tenShort, minutesOf, 480, 1)).toBe(stackEnd + 460);
  });
});
