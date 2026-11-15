"use client";

import Link from "next/link";

import { cn } from "@/lib/utils/cn";

/** The mark's three bars on its 32-unit tile, bottom-aligned at 24. */
const MARK_BARS = [
  { x: 7, height: 9 },
  { x: 14, height: 16 },
  { x: 21, height: 12 },
] as const;

const MARK_BAR_WIDTH = 4;
const MARK_BASELINE = 24;

type LogoProps = {
  /** On the brand-coloured auth panel the tile turns light. */
  onBrand?: boolean;
};

export const Logo = ({ onBrand = false }: LogoProps) => (
  <Link href="/" className="group relative z-10 flex w-fit items-center gap-3">
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="size-8 transition-transform group-hover:scale-105"
    >
      <rect
        width="32"
        height="32"
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
