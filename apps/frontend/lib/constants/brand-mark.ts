// The mark's three bars on its 32-unit tile, bottom-aligned at the baseline.
// The logo draws them filled in the tile; the brand pattern repeats them as an
// outline, so both stay one shape.
export const MARK_TILE = 32;
export const MARK_BASELINE = 24;
export const MARK_BAR_WIDTH = 4;

export const MARK_BARS = [
  { x: 7, height: 9 },
  { x: 14, height: 16 },
  { x: 21, height: 12 },
] as const;
