"use client";

import Link from "next/link";

import {
  MARK_BARS,
  MARK_BAR_WIDTH,
  MARK_BASELINE,
  MARK_TILE,
} from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

type LogoProps = {
  /** On the brand-coloured auth panel the tile turns light. */
  onBrand?: boolean;
};

export const Logo = ({ onBrand = false }: LogoProps) => (
  <Link href="/" className="group relative z-10 flex w-fit items-center gap-3">
    <svg
      viewBox={`0 0 ${MARK_TILE} ${MARK_TILE}`}
      aria-hidden="true"
      className="size-8 transition-transform group-hover:scale-105"
    >
      <rect
        width={MARK_TILE}
        height={MARK_TILE}
        rx="8"
        className={onBrand ? "fill-brand-foreground" : "fill-brand"}
      />
      {MARK_BARS.map(({ x, height }) => (
        <rect
          key={x}
          x={x}
          y={MARK_BASELINE - height}
          width={MARK_BAR_WIDTH}
          height={height}
          rx={MARK_BAR_WIDTH / 2}
          className={onBrand ? "fill-brand-deep" : "fill-brand-foreground"}
        />
      ))}
    </svg>

    <span
      className={cn(
        "text-xl font-semibold tracking-tight",
        onBrand ? "text-brand-foreground" : "text-foreground",
      )}
    >
      WorkTrack
    </span>
  </Link>
);
