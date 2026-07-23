"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  title?: string;
  subtitle?: string;
  size?: "sm" | "md";
  className?: string;
};

export function Logo({
  href = "/",
  title = "WorkTrack",
  subtitle = "Administration",
  size = "md",
  className,
}: LogoProps) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/images/worktrack-logo.webp"
        alt="WorkTrack"
        width={40}
        height={40}
        priority
        className={cn("w-auto", size === "sm" ? "h-8" : "h-9")}
      />

      <div className="min-w-0">
        <h2 className="truncate font-semibold text-zinc-900">{title}</h2>

        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );

  return <Link href={href}>{content}</Link>;
}
