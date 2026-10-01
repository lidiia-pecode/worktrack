import { useId } from "react";

import { cn } from "@/lib/utils/cn";

interface BrandPatternProps {
  className?: string;
}

export const BrandPattern = ({ className }: BrandPatternProps) => {
  const patternId = useId();

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
          width="288"
          height="288"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-8)"
        >
          <g
            fill="none"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Clock */}
            <g className="stroke-brand/45">
              <circle cx="62" cy="66" r="17" />
              <path d="M62 55v11l7 5" />
            </g>

            {/* Stopwatch */}
            <g className="stroke-brand/40">
              <circle cx="214" cy="100" r="16" />
              <path d="M214 78v-6M208 72h12M226 86l3-3M214 100l6-6" />
            </g>

            {/* A week filling up */}
            <g className="stroke-brand/40">
              <path d="M88 192a15 15 0 1 1-15 15" />
            </g>

            {/* A week of hours */}
            <g className="stroke-brand/35">
              <rect x="178" y="214" width="6" height="12" rx="3" />
              <rect x="189" y="206" width="6" height="20" rx="3" />
              <rect x="200" y="210" width="6" height="16" rx="3" />
              <rect x="211" y="200" width="6" height="26" rx="3" />
              <rect x="222" y="216" width="6" height="10" rx="3" />
            </g>
          </g>

          <circle cx="73" cy="207" r="2.5" className="fill-brand/35" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};
