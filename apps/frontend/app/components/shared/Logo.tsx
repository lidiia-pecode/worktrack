"use client";

import Link from "next/link";

import { cn } from "@/lib/utils/cn";

type LogoProps = {
  onDark?: boolean;
};

export const Logo = ({ onDark = false }: LogoProps) => (
  <Link href="/" className="group relative z-10 flex w-fit items-center gap-3">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-brand to-brand-secondary font-bold text-brand-foreground shadow-lg shadow-glow-primary transition-transform group-hover:scale-105">
      W
    </div>

    <span
      className={cn(
        "bg-clip-text text-xl font-semibold tracking-tight text-transparent",
        onDark ? "bg-brand-on-dark" : "bg-brand",
      )}
    >
      WorkTrack
    </span>
  </Link>
);
