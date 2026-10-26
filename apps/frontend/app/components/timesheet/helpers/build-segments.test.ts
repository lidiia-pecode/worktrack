import { describe, expect, it } from "vitest";

import {
  SEGMENT_GAP_PX,
  STACK_TOP_INSET_PX,
  offsetAtMinutes,
  stackHeight,
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

    // The 2-minute entry is drawn 6px tall, so its end is 6px down.
    expect(offsetAtMinutes(segments, minutesOf, 2, 1)).toBe(
      STACK_TOP_INSET_PX + 6,
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

describe("stackHeight", () => {
  it("counts the inset, every gap and the minimum heights", () => {
    expect(stackHeight([60, 2, 60], minutesOf, 1)).toBe(
      STACK_TOP_INSET_PX + 60 + SEGMENT_GAP_PX + 6 + SEGMENT_GAP_PX + 60,
    );
    expect(stackHeight([], minutesOf, 1)).toBe(0);
  });
});
