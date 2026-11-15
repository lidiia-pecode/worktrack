import { useId } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * `bold` fills a whole page behind a single card, where the motifs have room
 * to read as drawings. `fine` is the same marks at a third of their size on a
 * tighter tile: behind a band of figures it has to be texture, not pictures.
 */
type PatternScale = "fine" | "bold";

const SCALES: Record<
  PatternScale,
  { tile: number; motif: number; stroke: number; ink: string }
> = {
  fine: { tile: 96, motif: 0.3, stroke: 0.9, ink: "stroke-brand/25" },
  bold: { tile: 288, motif: 1, stroke: 1.75, ink: "stroke-brand/40" },
};

interface BrandPatternProps {
  scale?: PatternScale;
  className?: string;
}

export const BrandPattern = ({
  scale = "fine",
  className,
}: BrandPatternProps) => {
  const patternId = useId();
  const { tile, motif, stroke, ink } = SCALES[scale];
  // The marks are drawn around their own origin, so one set of coordinates
  // serves both scales.
  const place = (x: number, y: number) =>
    `translate(${x * tile} ${y * tile}) scale(${motif})`;

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
          width={tile}
          height={tile}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-8)"
        >
          <g
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={ink}
          >
            {/* Clock */}
            <g transform={place(0.22, 0.23)}>
              <circle cx="0" cy="0" r="17" />
              <path d="M0 -11v11l7 5" />
            </g>

            {/* Stopwatch */}
            <g transform={place(0.74, 0.58)}>
              <circle cx="0" cy="0" r="16" />
              <path d="M0 -22v-6M-6 -28h12M12 -14l3-3" />
            </g>

            {/* A week of hours */}
            <g transform={place(0.3, 0.85)}>
              <rect x="-25" y="-12" width="6" height="12" rx="3" />
              <rect x="-14" y="-20" width="6" height="20" rx="3" />
              <rect x="-3" y="-16" width="6" height="16" rx="3" />
              <rect x="8" y="-26" width="6" height="26" rx="3" />
              <rect x="19" y="-10" width="6" height="10" rx="3" />
            </g>
          </g>
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};
