"use client";

import Link from "next/link";

import { cn } from "@/lib/utils/cn";

type LogoProps = {
  onDark?: boolean;
};

export const Logo = ({ onDark = false }: LogoProps) => (
  <Link href="/" className="group relative z-10 flex w-fit items-center gap-3">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-bold text-brand-foreground transition-transform group-hover:scale-105">
      W
    </div>

    <span
      className={cn(
        "text-xl font-semibold tracking-tight",
        onDark ? "text-brand-on-dark" : "text-brand",
      )}
    >
      WorkTrack
    </span>
  </Link>
);
