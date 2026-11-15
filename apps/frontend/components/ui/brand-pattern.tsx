import { useId } from "react";

import {
  MARK_BARS,
  MARK_BAR_WIDTH,
  MARK_BASELINE,
  MARK_TILE,
} from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

const TILE_WIDTH = 56;
const TILE_HEIGHT = 52;
// The mark drawn at about 12px across, so the pattern reads as a texture.
const MOTIF_SCALE = 0.65;
// A brick layout: one mark in the middle of the left half, one on the right
// half's top edge, repeated on the bottom edge so the tile wraps cleanly.
const MOTIF_CENTRES = [
  [TILE_WIDTH * 0.25, TILE_HEIGHT * 0.5],
  [TILE_WIDTH * 0.75, 0],
  [TILE_WIDTH * 0.75, TILE_HEIGHT],
] as const;

// Brand lines on a light ground; light lines on the brand-coloured auth panel.
const TONE_INK = {
  brand: "stroke-brand/18",
  onBrand: "stroke-brand-foreground/13",
} as const;

interface BrandPatternProps {
  tone?: keyof typeof TONE_INK;
  className?: string;
}

/**
 * The mark's three bars as a 1px outline, repeated on a regular grid. One
 * size everywhere it appears: the standalone auth pages, the 404 and error
 * pages, the split auth panel, the landing page and the overview band.
 */
export const BrandPattern = ({
  tone = "brand",
  className,
}: BrandPatternProps) => {
  const patternId = useId();
  const centre = MARK_TILE / 2;

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className,
      )}
    >
      <defs>
        <pattern
          id={patternId}
          width={TILE_WIDTH}
          height={TILE_HEIGHT}
          patternUnits="userSpaceOnUse"
        >
          {/* The motif is scaled down, so its line is widened by the same
              factor to land at 1px. */}
          <g
            fill="none"
            strokeWidth={1 / MOTIF_SCALE}
            className={TONE_INK[tone]}
          >
            {MOTIF_CENTRES.map(([x, y]) => (
              <g
                key={`${x}-${y}`}
                transform={`translate(${x} ${y}) scale(${MOTIF_SCALE}) translate(${-centre} ${-centre})`}
              >
                {MARK_BARS.map((bar) => (
                  <rect
                    key={bar.x}
                    x={bar.x}
                    y={MARK_BASELINE - bar.height}
                    width={MARK_BAR_WIDTH}
                    height={bar.height}
                    rx={MARK_BAR_WIDTH / 2}
                  />
                ))}
              </g>
            ))}
          </g>
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};
